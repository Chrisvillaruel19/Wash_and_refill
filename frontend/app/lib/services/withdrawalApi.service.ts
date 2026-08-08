import { apiClient } from "../apiClient";

export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  adminName: string;
}

type BackendWithdrawal = {
  id: string;
  amount: string;
  reason: string;
  withdrawalDate: string;
  performedBy: string;
};

function mapWithdrawal(w: BackendWithdrawal): WithdrawalRecord {
  return {
    id: w.id,
    timestamp: w.withdrawalDate,
    amount: Number(w.amount),
    reason: w.reason,
    adminName: w.performedBy,
  };
}

export async function getWithdrawals(): Promise<WithdrawalRecord[]> {
  const { withdrawals } = await apiClient.get<{ withdrawals: BackendWithdrawal[] }>("/withdrawals");
  return withdrawals.map(mapWithdrawal);
}

export async function createWithdrawal(data: { amount: number; reason: string }): Promise<void> {
  await apiClient.post("/withdrawals", data);
}
