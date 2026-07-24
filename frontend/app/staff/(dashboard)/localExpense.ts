import { ExpenseRecord } from "./types";
import { addActivityLog } from "./localActivity";

const STORAGE_KEY = "wrlms_expenses";

export function getStoredExpenses(): ExpenseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addExpense(record: Omit<ExpenseRecord, "id" | "timestamp">): ExpenseRecord[] {
  const existing = getStoredExpenses();

  const newRecord: ExpenseRecord = {
    ...record,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  addActivityLog({
    type: "expense",
    message: `${record.submittedBy} added an expense of ₱${record.amount.toFixed(2)} for ${record.category}`,
  });

  return updated;
}
