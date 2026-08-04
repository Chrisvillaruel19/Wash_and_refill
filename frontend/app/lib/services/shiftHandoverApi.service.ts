import { apiClient } from "../apiClient";
import { ShiftHandoverRecord } from "../../staff/(dashboard)/types";

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
  expectedBalance: string;
  actualCashCount: string | null;
  notes: string | null;
  staffName: string;
};

function mapShiftHandover(h: BackendShiftHandover): ShiftHandoverRecord {
  const expectedCash = Number(h.expectedBalance);
  const laundrySales = Number(h.laundryEarnings);
  const supplySales = Number(h.supplySales);
  const customServiceSales = Number(h.customServiceSales);
  const withdrawals = Number(h.withdrawal);
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
  // just algebraically undoing it for display.
  const cashDrawer = expectedCash - (laundrySales + supplySales + customServiceSales) + withdrawals + expense;

  return {
    id: h.id,
    timestamp: h.endTime,
    staffName: h.staffName,
    cashDrawer,
    laundrySales,
    supplySales,
    customServiceSales,
    digitalSales: Number(h.digitalSales),
    withdrawals,
    expense,
    expectedCash,
    actualCashCounted,
    shortage: actualCashCounted - expectedCash,
    notes: h.notes ?? "",
  };
}

// Read-only for now — GET /shift-handover is shared, role-open state that
// already existed for Module 8. The staff-side create flow (Shift Handover
// page itself) is separate, not-yet-migrated scope.
export async function getShiftHandovers(): Promise<ShiftHandoverRecord[]> {
  const { shiftHandovers } = await apiClient.get<{ shiftHandovers: BackendShiftHandover[] }>(
    "/shift-handover"
  );
  return shiftHandovers.map(mapShiftHandover);
}
