import { apiClient } from "../apiClient";
import { ActivityLog } from "../../staff/(dashboard)/types";
import { ServerPageResult } from "../useServerPage";

type BackendAuditLog = {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
  performedBy: string;
};

type BackendAuditLogPage = {
  logs: BackendAuditLog[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// Server's per-page cap (see audit-log.controller.ts) — used as the fetch
// size for these two log tabs so the existing client-side search/pagination
// has a full, real page of matching records to work with, not just the
// first handful.
const MAX_PAGE_SIZE = 100;

// performedBy is prefixed on — see dashboard.service.ts's mapActivityLog
// for the identical reasoning (backend-resolved from AuditLog's real
// userId->User relation, not staffName-based).
function mapLog(log: BackendAuditLog, type: ActivityLog["type"]): ActivityLog {
  return {
    id: log.id,
    type,
    message: `${log.performedBy}: ${log.description}`,
    timestamp: log.createdAt,
  };
}

// Logs page "All" tab: every audit entry regardless of type.
export interface AuditLogEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Edited",
  DELETE: "Deleted",
  ARCHIVE: "Archived",
  RESTOCK: "Restock",
  WITHDRAWAL: "Withdrawal",
  PAYMENT: "Payment",
  CLAIM: "Claim",
  LOGIN: "Login",
  LOGOUT: "Logout",
  RESET_PASSWORD: "Password reset",
  REFUND: "Refund",
};

function mapEntry(log: BackendAuditLog): AuditLogEntry {
  return {
    id: log.id,
    type: ACTION_LABELS[log.action] ?? log.action,
    message: `${log.performedBy}: ${log.description}`,
    timestamp: log.createdAt,
  };
}

// One server page of every log type — for browsing the full history.
export async function getAllLogsPage(page: number, pageSize: number): Promise<ServerPageResult<AuditLogEntry>> {
  const result = await apiClient.get<BackendAuditLogPage>(`/audit-logs?page=${page}&pageSize=${pageSize}`);
  return { items: result.logs.map(mapEntry), totalPages: result.pagination.totalPages };
}

// The newest entries of every type, for searching — same cap as the other
// log tabs (the server returns at most MAX_PAGE_SIZE per request).
export async function getRecentLogs(): Promise<AuditLogEntry[]> {
  const result = await apiClient.get<BackendAuditLogPage>(`/audit-logs?pageSize=${MAX_PAGE_SIZE}`);
  return result.logs.map(mapEntry);
}

export async function getRestockLogs(): Promise<ActivityLog[]> {
  const result = await apiClient.get<BackendAuditLogPage>(
    `/audit-logs?action=RESTOCK&module=Inventory&pageSize=${MAX_PAGE_SIZE}`
  );
  return result.logs.map((l) => mapLog(l, "restock"));
}

// Self-service resets via the emailed link (Admin or Staff).
export async function getPasswordResetLogs(): Promise<ActivityLog[]> {
  const result = await apiClient.get<BackendAuditLogPage>(
    `/audit-logs?action=RESET_PASSWORD&pageSize=${MAX_PAGE_SIZE}`
  );
  return result.logs.map((l) => mapLog(l, "update"));
}

// Cancellations & Refunds, newest first: who cancelled an order, the Admin's
// refunds (cancelled or claimed paid orders) and the cash refunds staff
// handed over — one place to follow an order from cancelled to refunded.
export async function getRefundLogs(): Promise<ActivityLog[]> {
  const [refunds, cancellations] = await Promise.all([
    apiClient.get<BackendAuditLogPage>(`/audit-logs?action=REFUND&module=Order&pageSize=${MAX_PAGE_SIZE}`),
    apiClient.get<BackendAuditLogPage>(
      `/audit-logs?action=UPDATE&module=Order&descriptionPrefix=${encodeURIComponent("Cancelled order")}&pageSize=${MAX_PAGE_SIZE}`
    ),
  ]);
  return [...refunds.logs.map((l) => mapLog(l, "update")), ...cancellations.logs.map((l) => mapLog(l, "delete"))].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getEditedLogs(): Promise<ActivityLog[]> {
  const result = await apiClient.get<BackendAuditLogPage>(
    `/audit-logs?action=UPDATE&pageSize=${MAX_PAGE_SIZE}`
  );
  return result.logs.map((l) => mapLog(l, "update"));
}
