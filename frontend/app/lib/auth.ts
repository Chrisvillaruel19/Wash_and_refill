import { apiClient, setAccessToken, ApiError } from "./apiClient";

export interface StaffUser {
  username: string;
  password: string;
  name: string;
  role: "staff" | "admin";
}

// ⚠️ Still used by the Staff Inventory page's restock re-auth modal
// (AuthModal), which isn't integrated yet (Phase 3) — untouched here on
// purpose so that page keeps working exactly as before until its own turn.
const ADMIN_ACCOUNTS: StaffUser[] = [
  { username: "admin", password: "admin123", name: "Admin", role: "admin" },
];

const CURRENT_USER_KEY = "wrlms_current_user";

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
      // for type compatibility with Employee (localEmployees.ts), which
      // extends StaffUser and isn't touched until Phase 6.
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

export function verifyAdminPassword(password: string): boolean {
  return ADMIN_ACCOUNTS.some((u) => u.role === "admin" && u.password === password);
}
