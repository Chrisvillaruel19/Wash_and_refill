import { ShiftHandoverRecord, Order, ExpenseRecord } from "./types";
import { addActivityLog } from "./localActivity";
import { getStoredOrders } from "./localOrders";
import { getStoredExpenses } from "./localExpense";

const STORAGE_KEY = "wrlms_shift_handover";

export function getStoredShiftHandovers(): ShiftHandoverRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function submitShiftHandover(
  record: Omit<ShiftHandoverRecord, "id" | "timestamp">
): ShiftHandoverRecord[] {
  const existing = getStoredShiftHandovers();

  const newRecord: ShiftHandoverRecord = {
    ...record,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  addActivityLog({
    type: "update",
    message: `${record.staffName} submitted shift handover records`,
  });

  return updated;
}

// Shift scoping (Option B): "my current shift" = everything since MY most
// recently submitted handover, or everything if I've never submitted one.
// Exported so any page needing "what hasn't this staff member reported yet"
// (Shift Handover's own totals, Attendance's clock-out guard) uses this one
// definition instead of two possibly-inconsistent copies of it.
export function getLastHandoverTimestamp(
  staffName: string,
  records: ShiftHandoverRecord[]
): string | null {
  const mine = records.filter((r) => r.staffName === staffName);
  if (mine.length === 0) return null;
  return mine.reduce((latest, r) => (r.timestamp > latest ? r.timestamp : latest), mine[0].timestamp);
}

// There is one physical cash drawer, shared by everyone — so a new handover's
// starting float is whatever the single most recently submitted handover
// (across ALL staff, not just this one) actually counted at close-out. This
// is deliberately NOT staff-scoped, unlike shift scoping above: the drawer
// doesn't know or care who used it last.
const FALLBACK_CASH_DRAWER_START = 5000;

export function getCashDrawerStart(records: ShiftHandoverRecord[]): number {
  if (records.length === 0) return FALLBACK_CASH_DRAWER_START;
  const mostRecent = records.reduce((latest, r) =>
    r.timestamp > latest.timestamp ? r : latest
  );
  return mostRecent.actualCashCounted;
}

export function getUnreportedActivity(staffName: string): {
  orders: Order[];
  expenses: ExpenseRecord[];
} {
  const lastHandoverTimestamp = getLastHandoverTimestamp(staffName, getStoredShiftHandovers());

  const orders = getStoredOrders().filter(
    (o) =>
      o.staffName === staffName &&
      !!o.createdAt &&
      (!lastHandoverTimestamp || o.createdAt > lastHandoverTimestamp)
  );

  const expenses = getStoredExpenses().filter(
    (e) => e.submittedBy === staffName && (!lastHandoverTimestamp || e.timestamp > lastHandoverTimestamp)
  );

  return { orders, expenses };
}
