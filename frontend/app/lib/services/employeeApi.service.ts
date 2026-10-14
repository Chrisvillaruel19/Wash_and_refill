import { apiClient } from "../apiClient";

export interface Employee {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string; // ISO date, yyyy-mm-dd for the <input type="date"> form field
  status: EmployeeStatus;
  emailVerified: boolean;
}

export type EmployeeStatus = "Active" | "Inactive" | "Archived";

type BackendAccountStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

type BackendEmployee = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  hiredDate: string | null;
  accountStatus: BackendAccountStatus;
  emailVerifiedAt?: string | null;
};

const STATUS_LABEL: Record<BackendAccountStatus, EmployeeStatus> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

// Lifecycle: Active -> (deactivate) -> Inactive -> (archive) -> Archived.
// Active/Inactive live on the Employee page; Archived only on the Archive
// page. Restore/activate sends either back to Active.
function mapEmployee(e: BackendEmployee): Employee {
  return {
    id: e.id,
    username: e.username,
    name: e.name,
    email: e.email,
    phone: e.phone ?? "",
    hiredDate: e.hiredDate ? e.hiredDate.slice(0, 10) : "",
    status: STATUS_LABEL[e.accountStatus],
    emailVerified: !!e.emailVerifiedAt,
  };
}

// No status = everyone except archived (the Employee page's "All" tab).
export async function getEmployees(status?: "active" | "inactive" | "archived"): Promise<Employee[]> {
  const query = status ? `?status=${status}` : "";
  const result = await apiClient.get<{ employees: BackendEmployee[] }>(`/employee${query}`);
  return result.employees.map(mapEmployee);
}

export async function createEmployee(data: {
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string;
  password: string;
}): Promise<{ verificationEmailSent?: boolean }> {
  return apiClient.post<{ verificationEmailSent?: boolean }>("/employee/create", data);
}

export async function updateEmployee(
  id: string,
  data: { username: string; name: string; email: string; phone: string; hiredDate: string; password?: string }
): Promise<{ verificationEmailSent?: boolean }> {
  return apiClient.patch<{ verificationEmailSent?: boolean }>(`/employee/${id}`, data);
}

// Resends the verification link to a Staff member's current email.
export async function sendEmployeeVerification(id: string): Promise<string> {
  return apiClient.postMessage(`/employee/${id}/send-verification`);
}

export async function deactivateEmployee(id: string): Promise<void> {
  await apiClient.patch(`/employee/${id}/deactivate`);
}

export async function archiveEmployee(id: string): Promise<void> {
  await apiClient.patch(`/employee/${id}/archive`);
}

export async function restoreEmployee(id: string): Promise<void> {
  await apiClient.patch(`/employee/${id}/restore`);
}
