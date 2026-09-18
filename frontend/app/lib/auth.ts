import { apiClient, setAccessToken, ApiError, CURRENT_USER_KEY } from "./apiClient";
import { clockIn } from "./services/attendanceApi.service";

export interface StaffUser {
  username: string;
  password: string;
  name: string;
  role: "staff" | "admin";
}

// Backend's Role enum is "STAFF" | "ADMIN"; every existing page/hook reads
// StaffUser.role as lowercase "staff" | "admin" — mapped once here so
// nothing else in the app needs to know about the casing difference.
function mapRole(role: string): "staff" | "admin" {
  return role === "ADMIN" ? "admin" : "staff";
}

export async function login(username: string, password: string): Promise<StaffUser | null> {
  try {
    const result = await apiClient.post<{
      user: { id: string; username: string; name: string; role: string };
      accessToken: string;
    }>("/auth/login", { username, password });

    setAccessToken(result.accessToken);

    const user: StaffUser = {
      username: result.user.username,
      // Never store the real password client-side — this field exists only
      // for StaffUser's own shape; nothing reads it.
      password: "",
      name: result.user.name,
      role: mapRole(result.user.role),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }

    // Auto Time In — Staff only, never Admin. Best-effort: clockIn() is
    // already idempotent server-side (one Attendance row per business day,
    // a duplicate attempt just 409s), so an existing Time In for today is
    // never overwritten. Any failure (already clocked in, network error,
    // etc.) is intentionally swallowed — a broken/duplicate attendance call
    // must never block the Staff member from actually logging in.
    if (user.role === "staff") {
      try {
        await clockIn();
      } catch {
        // Intentionally ignored — see comment above.
      }
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

// Synchronous by design, matching every existing call site
// (getCurrentUser()?.name used across 8+ pages without awaiting) — reads
// the user snapshot login() already stored, rather than re-fetching.
export function getCurrentUser(): StaffUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Server-authoritative: LogoutService can block for two independent
// reasons — SHIFT_HANDOVER_REQUIRED (no handover submitted yet this shift)
// or UNREPORTED_FINANCIAL_ACTIVITY (money unclaimed since the last one) —
// both arrive as 409s the caller distinguishes by message text (see
// Sidebar.tsx). Neither writes anything server-side, so local state must
// never be cleared for either.
//
// Any other failure (a genuine network error, or a non-401 server error)
// also must NOT be treated as a successful logout — this session's status
// couldn't be confirmed, so the safest assumption is "still logged in,"
// not "logged out." The one exception is a 401 here specifically: it means
// the refresh token was already invalid/expired/revoked server-side before
// this call ever ran, so there is nothing left to preserve — clearing
// local state in that one case matches what every other 401 in this app
// already does (see apiClient.ts's clearStaleAuthState).
export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Session was already dead server-side — nothing to preserve, fall
      // through to clearing local state below.
    } else {
      // 409 (either business gate), any other server error, or a raw
      // network failure (not even an ApiError) — logout could not be
      // confirmed. Re-throw untouched so the caller can show the right
      // message and the user stays authenticated.
      throw error;
    }
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  setAccessToken(null);
}

// Admin-only self-service recovery. The backend applies the actual
// role gate (Staff accounts get a "contact your Administrator" message
// instead of a reset token) — this function just relays whatever message
// the backend returns, since that message *is* the meaningful response
// here (there's no data payload). Throws ApiError only for real failures
// (invalid email format, server error) — a "no account" or "staff account"
// case is still a 200 with an informative message, not a thrown error.
export async function forgotPassword(email: string): Promise<string> {
  return apiClient.postMessage("/auth/forgot-password", { email });
}

// Throws ApiError on an invalid/expired/already-used token or a validation
// failure (weak password, mismatch) — the caller shows that message inline.
export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<string> {
  return apiClient.postMessage("/auth/reset-password", { token, newPassword, confirmPassword });
}

// Admin-only (enforced server-side by requireRole(ADMIN)): sets/updates the
// shared Restock Authorization PIN Staff enter on the Inventory page. The
// PIN itself is never returned by the backend — success is indicated only
// by this not throwing.
export async function setRestockPin(pin: string, confirmPin: string): Promise<void> {
  await apiClient.patch("/auth/restock-pin", { pin, confirmPin });
}

// Pre-check used by the Staff Authorization modal for immediate feedback —
// NOT the authoritative check (the restock endpoint independently
// re-verifies). Returns a plain boolean for the 200 {valid} case; a
// thrown ApiError means the check itself failed (network/rate-limit/server
// error), which callers should treat as "not yet verified", not as a
// definitive wrong-PIN answer.
export async function verifyRestockPin(pin: string): Promise<boolean> {
  const result = await apiClient.post<{ valid: boolean }>("/auth/verify-restock-pin", { pin });
  return result.valid;
}

