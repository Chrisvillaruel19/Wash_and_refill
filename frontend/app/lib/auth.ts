import { getStoredEmployees } from "./localEmployees";

export interface StaffUser {
  username: string;
  password: string;
  name: string;
  role: "staff" | "admin";
}

// ⚠️ Temporary hardcoded account — replace with a real backend/users table
// later. Staff accounts now live in localEmployees.ts, managed via
// Admin → Employee. Only the admin account is still hardcoded here, since
// Admin-account management isn't a feature yet.
const ADMIN_ACCOUNTS: StaffUser[] = [
  { username: "admin", password: "admin123", name: "Admin", role: "admin" },
];

const CURRENT_USER_KEY = "wrlms_current_user";

export function login(username: string, password: string): StaffUser | null {
  const adminMatch = ADMIN_ACCOUNTS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  const employeeMatch = getStoredEmployees().find(
    (e) =>
      e.username.toLowerCase() === username.toLowerCase() &&
      e.password === password &&
      e.status === "Active"
  );

  const match: StaffUser | undefined =
    adminMatch ??
    (employeeMatch
      ? {
          username: employeeMatch.username,
          password: employeeMatch.password,
          name: employeeMatch.name,
          role: employeeMatch.role,
        }
      : undefined);

  if (!match) return null;

  if (typeof window !== "undefined") {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(match));
  }
  return match;
}

export function getCurrentUser(): StaffUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_USER_KEY);
}
export function verifyAdminPassword(password: string): boolean {
  return ADMIN_ACCOUNTS.some((u) => u.role === "admin" && u.password === password);
}