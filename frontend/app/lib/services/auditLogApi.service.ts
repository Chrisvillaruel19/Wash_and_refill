import { apiClient } from "../apiClient";
import { ActivityLog } from "../../staff/(dashboard)/types";

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

function mapLog(log: BackendAuditLog, type: ActivityLog["type"]): ActivityLog {
  return {
    id: log.id,
    type,
    message: log.description,
    timestamp: log.createdAt,
  };
}

export async function getRestockLogs(): Promise<ActivityLog[]> {
  const result = await apiClient.get<BackendAuditLogPage>(
    `/audit-logs?action=RESTOCK&module=Inventory&pageSize=${MAX_PAGE_SIZE}`
  );
  return result.logs.map((l) => mapLog(l, "restock"));
}

export async function getEditedLogs(): Promise<ActivityLog[]> {
  const result = await apiClient.get<BackendAuditLogPage>(
    `/audit-logs?action=UPDATE&pageSize=${MAX_PAGE_SIZE}`
  );
  return result.logs.map((l) => mapLog(l, "update"));
}
