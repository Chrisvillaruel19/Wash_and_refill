import { apiClient } from "../apiClient";

export type WithdrawalSource = "Cash" | "GCash";

export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  adminName: string;
  source: WithdrawalSource;
  // Set when taken from a closed shift's earnings; null = the open drawer.
  fromShift: { staffName: string; endTime: string } | null;
}

type BackendWithdrawal = {
  id: string;
  amount: string;
  reason: string;
  withdrawalDate: string;
  performedBy: string;
  source?: "CASH" | "GCASH";
  fromShift?: { staffName: string; endTime: string } | null;
};

function mapWithdrawal(w: BackendWithdrawal): WithdrawalRecord {
  return {
    id: w.id,
    timestamp: w.withdrawalDate,
    amount: Number(w.amount),
    reason: w.reason,
    adminName: w.performedBy,
    source: w.source === "GCASH" ? "GCash" : "Cash",
    fromShift: w.fromShift ?? null,
  };
}

export async function getWithdrawals(): Promise<WithdrawalRecord[]> {
  const { withdrawals } = await apiClient.get<{ withdrawals: BackendWithdrawal[] }>("/withdrawals");
  return withdrawals.map(mapWithdrawal);
}

export interface ShiftEarningsAvailable {
  handoverId: string;
  staffName: string;
  endTime: string;
  cashAvailable: number;
  gcashAvailable: number;
}

export interface AvailableToWithdraw {
  // Open shift's drawer cash, never including the starting cash.
  openShiftCash: number;
  startingCash: number;
  // Closed shifts that still have earnings left to withdraw, newest first.
  shifts: ShiftEarningsAvailable[];
}

export async function getAvailableToWithdraw(): Promise<AvailableToWithdraw> {
  const r = await apiClient.get<AvailableToWithdraw>("/withdrawals/available");
  return {
    openShiftCash: Number(r.openShiftCash),
    startingCash: Number(r.startingCash),
    shifts: r.shifts.map((s) => ({
      ...s,
      cashAvailable: Number(s.cashAvailable),
      gcashAvailable: Number(s.gcashAvailable),
    })),
  };
}

export async function createWithdrawal(data: {
  amount: number;
  reason: string;
  source: WithdrawalSource;
  // Omitted = the open shift's drawer.
  fromHandoverId?: string;
}): Promise<void> {
  await apiClient.post("/withdrawals", {
    amount: data.amount,
    reason: data.reason,
    source: data.source === "GCash" ? "GCASH" : "CASH",
    ...(data.fromHandoverId ? { fromHandoverId: data.fromHandoverId } : {}),
  });
}

export async function getCurrentDrawerBalance(): Promise<number> {
  const { currentBalance } = await apiClient.get<{ currentBalance: number | string }>(
    "/withdrawals/balance"
  );
  return Number(currentBalance);
}
