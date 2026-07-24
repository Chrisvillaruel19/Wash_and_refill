import { ActivityLog } from "./types";

const ACTIVITY_KEY = "wrlms_activity";

// Frontend-only development cap to avoid overflowing localStorage's shared
// 5-10MB quota (shared with orders, inventory, expenses, etc.). A real
// backend/database would store full history with no such limit — the
// Dashboard would just query the most recent N instead.
const ACTIVITY_LOG_LIMIT = 500;

export function getActivityLogs(): ActivityLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): ActivityLog[] {
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...logs].slice(0, ACTIVITY_LOG_LIMIT);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
  return updated;
}
