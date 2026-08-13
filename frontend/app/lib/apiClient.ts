// Real backend API client. Centralizes: base URL, attaching the access
// token, unwrapping the response body, and one silent refresh-and-retry on
// a 401 — so individual pages never have to reimplement any of this.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// M9 (reviewed, accepted MVP tradeoff — not an oversight): the access
// token lives in localStorage rather than JS-memory-only. Threat model:
// any XSS on this origin can read it, so its blast radius is real but
// bounded to its own 15-minute lifetime — the actually valuable, 7-day
// credential (the refresh token) is already httpOnly and never touchable
// by JS at all, regardless of this choice. Moving the access token to
// memory-only was considered and rejected: it would (a) require an async
// bootstrap/silent-refresh on every page load instead of the current
// synchronous localStorage read, adding a loading-flash to every reload,
// and (b) introduce a genuine multi-tab race — two tabs opened at once
// would both start with no in-memory token and both fire a silent refresh
// against the same single-use, rotating refresh cookie; only one can win,
// so the other would fail with no in-memory fallback to recover from.
// localStorage avoids both: it already survives reloads and is shared
// across tabs, so a silent refresh is only ever needed on genuine
// expiry/401, not on every tab open. Revisit if this app ever needs to
// defend against a realistic XSS threat this doesn't already mitigate.
const ACCESS_TOKEN_KEY = "wrlms_access_token";
// Owned here (not in auth.ts) so this file can clear it directly on an
// unrecoverable session, without importing from auth.ts and creating a
// circular dependency (auth.ts already imports apiClient/setAccessToken/
// ApiError from this file). auth.ts imports this constant instead of
// declaring its own copy.
export const CURRENT_USER_KEY = "wrlms_current_user";

// Not exported — only request() below needs it. Every other file goes
// through apiClient.get/post/patch/delete, which attach the token itself.
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// Set true once a refresh attempt has genuinely failed (session is
// unrecoverable), so subsequent requests don't each try — and fail — a
// fresh refresh call of their own. Reset the moment a real token is set
// again (a new login, or any future successful refresh).
let isSessionExpired = false;

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    isSessionExpired = false;
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

// Clears both pieces of client-side auth state and sends the user back to
// the login route. Only ever called after a real 401 survives a real
// refresh attempt (see requestEnvelope below) — never for an unrelated
// failure (403/404/500/network error), so a still-valid session is never
// torn down by this. No token is ever placed in the URL — this is a plain
// path navigation, nothing appended.
function clearStaleAuthState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;

      const body: ApiEnvelope<{ accessToken: string }> = await res.json().catch(() => ({}));
      if (!body.data?.accessToken) return false;

      setAccessToken(body.data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
