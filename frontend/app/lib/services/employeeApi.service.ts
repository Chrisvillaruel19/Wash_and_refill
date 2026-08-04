import { apiClient } from "../apiClient";

export interface Employee {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string; // ISO date, yyyy-mm-dd for the <input type="date"> form field
  status: "Active" | "Inactive";
}

type BackendAccountStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

type BackendEmployee = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  hiredDate: string | null;
  accountStatus: BackendAccountStatus;
};

// Frontend only models two states (Active/Inactive) — ARCHIVED maps to the
// "Inactive" display status the Employee/Archive pages already use; the
// backend's separate INACTIVE value stays unused/reserved, no UI action
// sets it.
function mapEmployee(e: BackendEmployee): Employee {
  return {
    id: e.id,
    username: e.username,
    name: e.name,
    email: e.email,
    phone: e.phone ?? "",
    hiredDate: e.hiredDate ? e.hiredDate.slice(0, 10) : "",
    status: e.accountStatus === "ACTIVE" ? "Active" : "Inactive",
  };
}

export async function getEmployees(): Promise<Employee[]> {
  const result = await apiClient.get<{ employees: BackendEmployee[] }>("/employee");
  return result.employees.map(mapEmployee);
}

export async function createEmployee(data: {
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string;
  password: string;
}): Promise<void> {
  await apiClient.post("/employee/create", data);
}

export async function updateEmployee(
  id: string,
  data: { username: string; name: string; email: string; phone: string; hiredDate: string; password?: string }
): Promise<void> {
  await apiClient.patch(`/employee/${id}`, data);
}

export async function archiveEmployee(id: string): Promise<void> {
  await apiClient.patch(`/employee/${id}/archive`);
}

export async function restoreEmployee(id: string): Promise<void> {
  await apiClient.patch(`/employee/${id}/restore`);
}
