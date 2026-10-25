import { apiClient, fetchAllPages } from "../apiClient";
import { notifyShiftChanged } from "../shiftEvents";
import { ShiftHandoverRecord, ShiftHandoverInventoryRow } from "../../staff/(dashboard)/types";
import type { ServerPageResult } from "../useServerPage";

type BackendShiftHandover = {
  id: string;
  startTime: string;
  endTime: string;
  laundryEarnings: string;
  supplySales: string;
  customServiceSales: string;
  digitalSales: string;
  expense: string;
  withdrawal: string;
  // Cash refunds staff handed to customers from the drawer this shift.
  cashRefunds?: string;
  // GCash refunds this handover reconciled (never part of the drawer).
  gcashRefunds?: number | string;
  // Stored on newer handovers; null on older ones.
  drawerStart?: string | null;
  expectedBalance: string;
  actualCashCount: string | null;
  notes: string | null;
  staffName: string;
  inventorySnapshot?: ShiftHandoverInventoryRow[];
};

function mapShiftHandover(h: BackendShiftHandover): ShiftHandoverRecord {
  const expectedCash = Number(h.expectedBalance);
  const laundrySales = Number(h.laundryEarnings);
  const supplySales = Number(h.supplySales);
  const customServiceSales = Number(h.customServiceSales);
  const withdrawals = Number(h.withdrawal);
  const refundsPaid = Number(h.cashRefunds ?? 0);
  const expense = Number(h.expense);
  // actualCashCount is required by the create schema, so every real record
  // has it — null is only a defensive DB-nullability edge case, not an
  // expected state. Falls back to 0 rather than fabricating a shortage.
  const actualCashCounted = h.actualCashCount !== null ? Number(h.actualCashCount) : 0;

  // Backend doesn't store the starting cash-drawer amount as its own
  // column — it's implicit in how expectedBalance was computed at create
  // time (see create-shift-handover.service.ts: expectedBalance =
  // drawerStart + cashSalesTotal - withdrawalTotal - expenseTotal, where
  // cashSalesTotal excludes digital). Reconstructed here with the exact
  // inverse of that same formula — not a re-derivation of business logic,
  // just algebraically undoing it for display. GCash (digitalSales) is part
  // of the category totals but never entered expectedBalance, so it has to
  // come back out here — otherwise a GCash shift shows float − GCash.
  // Newer handovers store their starting cash, so no reversal is needed.
  const cashSales = laundrySales + supplySales + customServiceSales - Number(h.digitalSales);
  const cashDrawer =
    h.drawerStart != null ? Number(h.drawerStart) : expectedCash - cashSales + withdrawals + expense + refundsPaid;

  return {
    id: h.id,
    timestamp: h.endTime,
    staffName: h.staffName,
    cashDrawer,
    laundrySales,
    supplySales,
    customServiceSales,
    digitalSales: Number(h.digitalSales),
    gcashRefunds: Number(h.gcashRefunds ?? 0),
    withdrawals,
    refundsPaid,
    expense,
    expectedCash,
    actualCashCounted,
    shortage: actualCashCounted - expectedCash,
    notes: h.notes ?? "",
    inventorySnapshot: h.inventorySnapshot ?? [],
  };
}

// GET /shift-handover is shared, role-open state — every authenticated user
// sees every handover (one physical drawer, not private per-user data).
export async function getShiftHandovers(): Promise<ShiftHandoverRecord[]> {
  const shiftHandovers = await fetchAllPages<BackendShiftHandover>("/shift-handover", "shiftHandovers");
  return shiftHandovers.map(mapShiftHandover);
}

// Genuine single-page fetch — for the Handover History table (Staff) and
// the handover grid (Admin Sales), both driven by useServerPage.ts.
export async function getShiftHandoversPage(
  page: number,
  pageSize: number
): Promise<ServerPageResult<ShiftHandoverRecord>> {
  const result = await apiClient.get<{
    shiftHandovers: BackendShiftHandover[];
    pagination: { totalPages: number };
  }>(`/shift-handover?page=${page}&pageSize=${pageSize}`);
  return { items: result.shiftHandovers.map(mapShiftHandover), totalPages: result.pagination.totalPages };
}

// One staff member's handovers, a page at a time (Admin Sales' staff view).
export async function getStaffShiftHandoversPage(
  userId: string,
  page: number,
  pageSize: number
): Promise<{ items: ShiftHandoverRecord[]; totalPages: number; total: number }> {
  const result = await apiClient.get<{
    shiftHandovers: BackendShiftHandover[];
    pagination: { totalPages: number; total: number };
  }>(`/shift-handover?userId=${encodeURIComponent(userId)}&page=${page}&pageSize=${pageSize}`);
  return {
    items: result.shiftHandovers.map(mapShiftHandover),
    totalPages: result.pagination.totalPages,
    total: result.pagination.total,
  };
}

// Admin Sales' Cashier Shift Summary: one row per staff member.
export interface StaffShiftSummary {
  userId: string;
  staffName: string;
  shifts: number;
  lastShift: string | null;
  totalSales: number;
  // Net counted − expected across all their shifts (negative = short).
  overShort: number;
}

export async function getStaffShiftSummary(): Promise<StaffShiftSummary[]> {
  const result = await apiClient.get<{ staff: StaffShiftSummary[] }>("/shift-handover/staff-summary");
  return result.staff.map((s) => ({
    ...s,
    shifts: Number(s.shifts),
    totalSales: Number(s.totalSales),
    overShort: Number(s.overShort),
  }));
}

// The shared drawer's most recent state, needed only as a single record
// (Shift Handover's starting balance) — GET /shift-handover is already
// sorted endTime desc, so pageSize=1 hands back exactly that record without
// fetching the entire history just to find its max. Reuses the existing
// paginated endpoint; no new backend surface. Also returns the backend-
// authoritative defaultStartingCash from the same response, so the caller
// never has to independently decide "no previous handover" behavior —
// see create-shift-handover.service.ts's getDrawerStart, which this
// mirrors exactly: previous handover's actualCashCount if one exists,
// else the Admin-configured default.
export async function getMostRecentShiftHandover(): Promise<{
  record: ShiftHandoverRecord | null;
  defaultStartingCash: number;
}> {
  const result = await apiClient.get<{
    shiftHandovers: BackendShiftHandover[];
    defaultStartingCash: string;
  }>(`/shift-handover?page=1&pageSize=1`);
  return {
    record: result.shiftHandovers[0] ? mapShiftHandover(result.shiftHandovers[0]) : null,
    defaultStartingCash: Number(result.defaultStartingCash),
  };
}

// Admin-only (enforced server-side by requireRole(ADMIN)) — reuses the same
// GET /shift-handover response's defaultStartingCash field rather than a
// dedicated read endpoint, matching the "smallest clean API" principle:
// the value is already returned there for the Staff page's own use.
export async function getDefaultStartingCash(): Promise<number> {
  const result = await apiClient.get<{ defaultStartingCash: string }>(`/shift-handover?page=1&pageSize=1`);
  return Number(result.defaultStartingCash);
}

// Admin-only. Backend validates positive/finite/sane-max and writes an
// AuditLog entry — this call is a thin pass-through, no client-side
// business logic duplicated here.
export async function updateDefaultStartingCash(defaultStartingCash: number): Promise<void> {
  await apiClient.patch("/shift-handover/drawer-settings", { defaultStartingCash });
}

// The open shift's beginning count per supply item — the same rule the
// handover snapshot uses on submit (keyed by inventory id).
export async function getInventoryBeginning(): Promise<Map<string, number>> {
  const { items } = await apiClient.get<{ items: { inventoryId: string; beginningQty: number }[] }>(
    "/shift-handover/inventory-beginning"
  );
  return new Map(items.map((i) => [i.inventoryId, Number(i.beginningQty)]));
}

export interface PendingWithdrawals {
  // Cash the Admin took out of the drawer since the last handover.
  total: number;
  withdrawals: { id: string; amount: number; reason: string; withdrawalDate: string }[];
  // Cash refunds staff handed to customers since the last handover.
  refundsPaidTotal: number;
  refundsPaid: { id: string; amount: number; reason: string; customerName: string; paidOutAt: string; paidOutBy: string }[];
  // Approved refunds not handed over yet (still in the drawer).
  refundsToGiveTotal: number;
  // Every expense paid from the drawer since the last handover (any staff).
  expensesTotal: number;
  // What the drawer held when this shift started: the starting cash, plus
  // sales not yet withdrawn (carriedOver > 0) or minus what a refund or
  // expense used of it (carriedOver < 0). null until the backend has it.
  startingCash: number | null;
  startingCashFloat: number | null;
  startingCashCarriedOver: number;
  // GCash refunds since the last handover (this shift's GCash after them).
  gcashRefundsTotal: number;
  gcashRefunds: { id: string; amount: number; reason: string; customerName: string; createdAt: string }[];
}

// Everything besides expenses that took cash out of the open drawer since
// the last handover — part of this shift's expected cash.
export async function getPendingWithdrawals(): Promise<PendingWithdrawals> {
  const r = await apiClient.get<PendingWithdrawals>("/shift-handover/pending-withdrawals");
  return {
    total: Number(r.total),
    withdrawals: r.withdrawals.map((w) => ({ ...w, amount: Number(w.amount) })),
    refundsPaidTotal: Number(r.refundsPaidTotal),
    refundsPaid: r.refundsPaid.map((p) => ({ ...p, amount: Number(p.amount) })),
    refundsToGiveTotal: Number(r.refundsToGiveTotal),
    expensesTotal: Number(r.expensesTotal ?? 0),
    startingCash: r.startingCash != null ? Number(r.startingCash) : null,
    startingCashFloat: r.startingCashFloat != null ? Number(r.startingCashFloat) : null,
    startingCashCarriedOver: Number(r.startingCashCarriedOver ?? 0),
    gcashRefundsTotal: Number(r.gcashRefundsTotal ?? 0),
    gcashRefunds: (r.gcashRefunds ?? []).map((g) => ({ ...g, amount: Number(g.amount) })),
  };
}

// The response's shiftHandover object has no `staffName` (create doesn't
// join User the way list does) — callers should re-fetch via
// getShiftHandovers() afterward, same pattern as Expense/Withdrawal create.
export async function createShiftHandover(data: {
  actualCashCounted: number;
  notes?: string;
}): Promise<void> {
  await apiClient.post("/shift-handover", data);
  // A submitted handover ends operational work for this shift.
  notifyShiftChanged();
}
