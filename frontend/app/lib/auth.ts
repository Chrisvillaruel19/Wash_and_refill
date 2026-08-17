import { apiClient, setAccessToken, ApiError, CURRENT_USER_KEY } from "./apiClient";

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

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Even if the server call fails (e.g. already-expired refresh token),
    // still clear local state below so the user isn't stuck logged in on
    // this device.
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

