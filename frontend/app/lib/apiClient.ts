// Real backend API client. Centralizes: base URL, attaching the access
// token, unwrapping the response body, and one silent refresh-and-retry on
// a 401 — so individual pages never have to reimplement any of this.
import { notifyShiftChanged, NO_ACTIVE_SHIFT_REASON } from "./shiftEvents";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// The 15-minute access token lives in memory only — never localStorage or
// sessionStorage, where any script on the page could read it. The session
// itself is the 7-day httpOnly refresh-token cookie (unreadable by JS), so a
// reload or a reopened browser restores access with one silent refresh
// (see refreshAccessToken, which serializes refreshes across tabs so two
// tabs can't both spend the same single-use refresh token).
let accessToken: string | null = null;
// Older builds kept the token in localStorage — removed on load so no copy
// is left behind.
const LEGACY_ACCESS_TOKEN_KEY = "wrlms_access_token";
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } catch {
    // Storage unavailable — nothing to clean up.
  }
}
// Owned here (not in auth.ts) so this file can clear it directly on an
// unrecoverable session, without importing from auth.ts and creating a
// circular dependency (auth.ts already imports apiClient/setAccessToken/
// ApiError from this file). auth.ts imports this constant instead of
// declaring its own copy.
export const CURRENT_USER_KEY = "wrlms_current_user";

// Not exported — only request() below needs it. Every other file goes
// through apiClient.get/post/patch/delete, which attach the token itself.
function getAccessToken(): string | null {
  return accessToken;
}

// Set true once a refresh attempt has genuinely failed (session is
// unrecoverable), so subsequent requests don't each try — and fail — a
// fresh refresh call of their own. Reset the moment a real token is set
// again (a new login, or any future successful refresh).
let isSessionExpired = false;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) isSessionExpired = false;
}

// Clears both pieces of client-side auth state and sends the user back to
// the login route. Only ever called after a real 401 survives a real
// refresh attempt (see requestEnvelope below) — never for an unrelated
// failure (403/404/500/network error), so a still-valid session is never
// torn down by this. No token is ever placed in the URL — this is a plain
// path navigation, nothing appended.
function clearStaleAuthState(): void {
  accessToken = null;
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_USER_KEY);
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Most endpoints return {code, status, message, data}. The three Auth
// endpoints (login/refresh-token/logout) return {message, data} with no
// code/status — a known backend inconsistency, deliberately not being
// fixed on the backend. This type covers both shapes so callers don't have
// to care which one a given endpoint uses.
type ApiEnvelope<T> = {
  code?: number;
  status?: string;
  message?: string;
  data?: T;
  // validateSchema's 400 response shape: the top-level `message` is always
  // the generic "Validation failed" — the actual field-level reason only
  // exists here. Read by request() below so callers see the real reason,
  // not just "Validation failed".
  errors?: { path: string; message: string }[];
  // Machine-readable cause on some errors, e.g. NO_ACTIVE_SHIFT from the
  // backend's requireActiveShift guard.
  reason?: string;
};

function formatErrorMessage(body: ApiEnvelope<unknown>): string {
  if (body.errors && body.errors.length > 0) {
    return body.errors.map((e) => e.message).join(" ");
  }
  return body.message || "Request failed";
}

const NO_REFRESH_RETRY_PATHS = ["/auth/login", "/auth/refresh-token"];

// Shared by request() (returns just .data, what almost every endpoint's
// caller wants) and requestEnvelope() below (returns the full envelope —
// needed by the two forgot/reset-password endpoints, whose meaningful
// response is the top-level `message`, not a `data` payload).
async function requestEnvelope<T>(
  path: string,
  init: RequestInit = {},
  isRetry = false
): Promise<ApiEnvelope<T>> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // Sends/receives the httpOnly refreshToken cookie the backend sets on
    // login — required since the frontend (3000) and backend (8000) are
    // different origins even both on localhost.
    credentials: "include",
  });

  const body: ApiEnvelope<T> = await res.json().catch(() => ({}) as ApiEnvelope<T>);

  if (res.status === 401 && !isRetry && !NO_REFRESH_RETRY_PATHS.includes(path)) {
    if (!isSessionExpired) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestEnvelope<T>(path, init, true);
      }

      // Refresh genuinely failed (expired/revoked/absent refresh token) —
      // this session cannot be recovered by retrying. Clear stale state and
      // send the user back to login once, instead of leaving every future
      // request silently retrying and failing forever against a token that
      // will never work again.
      isSessionExpired = true;
      clearStaleAuthState();
    }
  }

  if (!res.ok) {
    // The server says this user isn't on an active shift (clocked out in
    // another tab, auto-closed, handed over…) — refresh the Staff portal's
    // shift state so every page shows it, not just this one error.
    if (body.reason === NO_ACTIVE_SHIFT_REASON) notifyShiftChanged();
    throw new ApiError(formatErrorMessage(body), res.status);
  }

  return body;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await requestEnvelope<T>(path, init);
  return body.data as T;
}

// Deduplicates concurrent refresh attempts. Refresh tokens are single-use
// and rotated on the backend, so if two requests hit a 401 at the same
// moment (guaranteed by React's dev-mode double effect invocation, and
// realistic in production too — e.g. a page firing several apiClient calls
// via Promise.all right as the access token expires), each independently
// calling this function would let only the first refresh succeed; every
// other concurrent caller would fail against an already-consumed token,
// even though the session is genuinely still valid. Reproduced live twice
// during integration testing (Admin Attendance, Claim Monitoring) before
// being traced to this cause. The fix: only ever have one refresh in
// flight — every concurrent caller awaits that same promise instead of
// starting its own.
// "rejected" = the server refused the refresh (no/expired/revoked session);
// "unreachable" = no answer at all (network/server down) — not a logout.
export type RefreshResult = "ok" | "rejected" | "unreachable";
let refreshPromise: Promise<RefreshResult> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSession()) === "ok";
}

// Whether this tab already holds an access token (it lives in memory only,
// so it's gone after a reload or a reopened browser).
export function hasAccessToken(): boolean {
  return accessToken !== null;
}

// Gets a fresh access token from the httpOnly refresh cookie. One refresh
// at a time per tab (concurrent callers share it) and across tabs (lock).
export function refreshSession(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  // The refresh token is single-use (rotated on every refresh, and replaying
  // a used one revokes the whole session), and the cookie is shared by every
  // tab — so two tabs opened together must not refresh at the same moment.
  // A cross-tab Web Lock queues them: the second tab refreshes only after
  // the first has received (and the browser stored) the rotated cookie.
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  // LockManager.request resolves with the callback's own resolved value;
  // its TS signature just doesn't unwrap the inner promise.
  const run: Promise<RefreshResult> = locks
    ? (locks.request("wrlms-auth-refresh", () => doRefresh()) as unknown as Promise<RefreshResult>)
    : doRefresh();
  const pending = run.finally(() => {
    refreshPromise = null;
  });
  refreshPromise = pending;
  return pending;
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    // 5xx/429 = the server couldn't decide, not "your session is invalid".
    if (res.status >= 500 || res.status === 429) return "unreachable";
    if (!res.ok) return "rejected";

    const body: ApiEnvelope<{ accessToken: string }> = await res.json().catch(() => ({}));
    if (!body.data?.accessToken) return "rejected";

    setAccessToken(body.data.accessToken);
    return "ok";
  } catch {
    return "unreachable";
  }
}

// Orders/Expenses/Shift Handovers are now server-paginated (bounded query
// size on the backend, capped at pageSize=100) — but every existing caller
// of getOrders()/getExpenses()/getShiftHandovers() still expects "the
// complete list" (dashboard totals, sales stat cards, the shift-handover
// reconciliation's unclaimed-order check). Rather than rewrite every one of
// those consumers to be pagination-aware, this walks every page server-side
// and concatenates — callers keep their existing "fetch everything" contract
// unchanged, while each individual request to the backend stays bounded.
export async function fetchAllPages<T>(
  path: string,
  dataKey: string
): Promise<T[]> {
  const PAGE_SIZE = 100;
  let page = 1;
  const all: T[] = [];
  for (;;) {
    const separator = path.includes("?") ? "&" : "?";
    const result = await request<Record<string, unknown>>(
      `${path}${separator}page=${page}&pageSize=${PAGE_SIZE}`
    );
    const rows = (result[dataKey] as T[] | undefined) ?? [];
    all.push(...rows);
    const totalPages = (result.pagination as { totalPages?: number } | undefined)?.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // For endpoints whose response is a human-readable message rather than a
  // data payload (forgot/reset-password) — returns the envelope's top-level
  // `message` string instead of `.data`.
  postMessage: async (path: string, body?: unknown): Promise<string> => {
    const envelope = await requestEnvelope<unknown>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return envelope.message ?? "";
  },
};
