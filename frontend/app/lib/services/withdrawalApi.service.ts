import { apiClient } from "../apiClient";

export type WithdrawalSource = "Cash" | "GCash";

export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  adminName: string;
  source: WithdrawalSource;
  // Set when taken from a closed shift's earnings; null = the open shift's
  // drawer (Cash) or the GCash balance.
  fromShift: { staffName: string; endTime: string } | null;
  // True when this paid a claimed order's refund rather than being earnings.
  isRefund: boolean;
}

type BackendWithdrawal = {
  id: string;
  amount: string;
  reason: string;
  withdrawalDate: string;
  performedBy: string;
  source?: "CASH" | "GCASH";
  fromShift?: { staffName: string; endTime: string } | null;
  refundId?: string | null;
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
    isRefund: !!w.refundId,
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
    // The open shift so far: cash sales − expenses − withdrawals − refunds
    // staff handed out.
    openShift: number;
    // Approved cash refunds not handed to customers yet — held back.
    owedRefunds: number;
  };
  // One live balance: sales − refunds − withdrawn (never below zero).
  gcash: {
    total: number;
    sales: number;
    refunds: number;
    withdrawn: number;
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
      owedRefunds: Number(r.cash.owedRefunds ?? 0),
    },
    gcash: {
      total: Number(r.gcash.total),
      sales: Number(r.gcash.sales),
      refunds: Number(r.gcash.refunds),
      withdrawn: Number(r.gcash.withdrawn),
    },
  };
}

// One row of the money summary, split by how the money moved.
export interface MoneyRow {
  cash: number;
  gcash: number;
  total: number;
}

// Today's money, every figure live from the same records as Today's Sales
// and the Withdraw window: net = sales − refunds = Today's Sales.
export interface MoneySummary {
  sales: MoneyRow;
  refunds: MoneyRow;
  net: MoneyRow;
  withdrawn: MoneyRow;
  available: MoneyRow;
}

export async function getMoneySummary(): Promise<MoneySummary> {
  const r = await apiClient.get<MoneySummary>("/withdrawals/summary");
  const row = (x: MoneyRow): MoneyRow => ({ cash: Number(x.cash), gcash: Number(x.gcash), total: Number(x.total) });
  return {
    sales: row(r.sales),
    refunds: row(r.refunds),
    net: row(r.net),
    withdrawn: row(r.withdrawn),
    available: row(r.available),
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
