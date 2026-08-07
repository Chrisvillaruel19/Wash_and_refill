// Real backend API client. Centralizes: base URL, attaching the access
// token, unwrapping the response body, and one silent refresh-and-retry on
// a 401 — so individual pages never have to reimplement any of this.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const ACCESS_TOKEN_KEY = "wrlms_access_token";

// Not exported — only request() below needs it. Every other file goes
// through apiClient.get/post/patch/delete, which attach the token itself.
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
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

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
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
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  if (!res.ok) {
    throw new ApiError(formatErrorMessage(body), res.status);
  }

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
};
