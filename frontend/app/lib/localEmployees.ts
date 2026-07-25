import type { StaffUser } from "./auth";
import { addActivityLog } from "../staff/(dashboard)/localActivity";

export interface Employee extends StaffUser {
  id: string;
  email: string;
  phone: string;
  hiredDate: string; // ISO date
  status: "Active" | "Inactive";
}

const EMPLOYEES_KEY = "wrlms_employees";

// Seed data mirrors the credentials that used to live in auth.ts's
// STAFF_ACCOUNTS exactly, so nothing that could already log in stops
// working. The "admin" account is deliberately excluded here — it stays
// hardcoded in auth.ts since Admin-account management isn't a feature yet.
const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "1",
    username: "eleno",
    password: "1234",
    name: "Eleno",
    role: "staff",
    email: "eleno@example.com",
    phone: "",
    hiredDate: "2026-01-15",
    status: "Active",
  },
  {
    id: "2",
    username: "chris",
    password: "1234",
    name: "Chris",
    role: "staff",
    email: "chris@example.com",
    phone: "",
    hiredDate: "2026-01-15",
    status: "Active",
  },
];

export function getStoredEmployees(): Employee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (!raw) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(DEFAULT_EMPLOYEES));
      return DEFAULT_EMPLOYEES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_EMPLOYEES;
  }
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

export function addEmployee(
  employee: Omit<Employee, "id" | "role" | "status">
): Employee[] {
  const existing = getStoredEmployees();

  const newEmployee: Employee = {
    ...employee,
    id: `${Date.now()}`,
    role: "staff",
    status: "Active",
  };

  const updated = [newEmployee, ...existing];
  saveEmployees(updated);

  addActivityLog({
    type: "employee",
    message: `Admin added a new employee: ${newEmployee.name}`,
  });

  return updated;
}

export function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id">>
): Employee[] {
  const existing = getStoredEmployees();
  const target = existing.find((e) => e.id === id);

  const updated = existing.map((e) => (e.id === id ? { ...e, ...updates } : e));
  saveEmployees(updated);

  if (target) {
    addActivityLog({
      type: "employee",
      message: `Admin updated employee: ${target.name}`,
    });
  }

  return updated;
}

export function archiveEmployee(id: string): Employee[] {
  const existing = getStoredEmployees();
  const target = existing.find((e) => e.id === id);

  const updated = existing.map((e) =>
    e.id === id ? { ...e, status: "Inactive" as const } : e
  );
  saveEmployees(updated);

  if (target) {
    addActivityLog({
      type: "employee",
      message: `Admin archived employee: ${target.name}`,
    });
  }

  return updated;
}

export function restoreEmployee(id: string): Employee[] {
  const existing = getStoredEmployees();
  const target = existing.find((e) => e.id === id);

  const updated = existing.map((e) =>
    e.id === id ? { ...e, status: "Active" as const } : e
  );
  saveEmployees(updated);

  if (target) {
    addActivityLog({
      type: "employee",
      message: `Admin restored employee: ${target.name}`,
    });
  }

  return updated;
}
