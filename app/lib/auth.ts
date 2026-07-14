export interface StaffUser {
  username: string;
  password: string;
  name: string;
  role: string;
}

// ⚠️ Temporary hardcoded accounts — replace with real backend login later.
const STAFF_ACCOUNTS: StaffUser[] = [
  { username: "eleno", password: "1234", name: "Eleno", role: "staff" },
  { username: "chris", password: "1234", name: "Chris", role: "staff" },
];

const CURRENT_USER_KEY = "wrlms_current_user";

export function login(username: string, password: string): StaffUser | null {
  const match = STAFF_ACCOUNTS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
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