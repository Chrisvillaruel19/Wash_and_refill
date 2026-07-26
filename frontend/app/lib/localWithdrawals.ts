import { addActivityLog } from "../staff/(dashboard)/localActivity";

const WITHDRAWALS_KEY = "wrlms_withdrawals";

// Demo-only stub — see project_wrlms_known_issues for the "Path A" note.
// Withdrawal amounts here are NOT read by Staff's Shift Handover cash
// reconciliation; this entity exists independently and has zero effect on
// any cash total anywhere in the app. That's deliberate: this only "works"
// correctly within one shared browser, and wiring it into Staff's math
// would silently produce wrong reconciliation the moment Admin and Staff
// run on different machines. Wire up once a backend exists.
export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  adminName: string;
}

export function getStoredWithdrawals(): WithdrawalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addWithdrawal(
  record: Omit<WithdrawalRecord, "id" | "timestamp">
): WithdrawalRecord[] {
  const existing = getStoredWithdrawals();

  const newRecord: WithdrawalRecord = {
    ...record,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing];
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(updated));

  addActivityLog({
    type: "withdrawal",
    message: `Admin ${record.adminName} withdrew ₱${record.amount.toFixed(2)} — ${record.reason}`,
  });

  return updated;
}
