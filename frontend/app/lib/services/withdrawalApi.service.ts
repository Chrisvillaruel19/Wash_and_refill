import { apiClient } from "../apiClient";

export type WithdrawalSource = "Cash" | "GCash";

export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  adminName: string;
  source: WithdrawalSource;
  // Set when taken from a closed shift's earnings; null = the open shift's drawer.
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

export interface ShiftPortion {
  handoverId: string;
  staffName: string;
  endTime: string;
  available: number;
}

export interface AvailableToWithdraw {
  // The fixed float — never withdrawable.
  startingCash: number;
  cash: {
    total: number;
    // Left above the starting cash at the last handover's count, minus what
    // was already taken from it. Negative = that count was short.
    lastShift: ShiftPortion | null;
    // The open shift so far: cash sales − expenses − withdrawals.
    openShift: number;
  };
  gcash: {
    total: number;
    // Closed shifts with GCash not yet withdrawn, oldest first.
    shifts: ShiftPortion[];
  };
}

function mapPortion(s: ShiftPortion): ShiftPortion {
  return { ...s, available: Number(s.available) };
}

export async function getAvailableToWithdraw(): Promise<AvailableToWithdraw> {
  const r = await apiClient.get<AvailableToWithdraw>("/withdrawals/available");
  return {
    startingCash: Number(r.startingCash),
    cash: {
      total: Number(r.cash.total),
      lastShift: r.cash.lastShift ? mapPortion(r.cash.lastShift) : null,
      openShift: Number(r.cash.openShift),
    },
    gcash: {
      total: Number(r.gcash.total),
      shifts: r.gcash.shifts.map(mapPortion),
    },
  };
}

// One amount per source — the server splits it across the shifts it came from.
export async function createWithdrawal(data: {
  amount: number;
  reason: string;
  source: WithdrawalSource;
}): Promise<void> {
  await apiClient.post("/withdrawals", {
    amount: data.amount,
    reason: data.reason,
    source: data.source === "GCash" ? "GCASH" : "CASH",
  });
}

export async function getCurrentDrawerBalance(): Promise<number> {
  const { currentBalance } = await apiClient.get<{ currentBalance: number | string }>(
    "/withdrawals/balance"
  );
  return Number(currentBalance);
}
