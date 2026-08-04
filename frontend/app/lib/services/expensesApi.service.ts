import { apiClient } from "../apiClient";
import { ExpenseRecord, ExpenseCategory } from "../../staff/(dashboard)/types";

type BackendExpenseCategory =
  | "SUPPLIES_AND_MATERIALS"
  | "UTILITIES"
  | "EQUIPMENT_REPAIR"
  | "RENT"
  | "OTHER";

const CATEGORY_TO_BACKEND: Record<ExpenseCategory, BackendExpenseCategory> = {
  "Supplies & Materials": "SUPPLIES_AND_MATERIALS",
  Utilities: "UTILITIES",
  "Equipment Repair": "EQUIPMENT_REPAIR",
  Rent: "RENT",
  Other: "OTHER",
};

const CATEGORY_FROM_BACKEND: Record<BackendExpenseCategory, ExpenseCategory> = {
  SUPPLIES_AND_MATERIALS: "Supplies & Materials",
  UTILITIES: "Utilities",
  EQUIPMENT_REPAIR: "Equipment Repair",
  RENT: "Rent",
  OTHER: "Other",
};

type BackendExpense = {
  id: string;
  amount: string;
  category: BackendExpenseCategory;
  description: string;
  receiptUrl?: string | null;
  expenseDate: string;
  submittedBy: string;
};

function mapExpense(e: BackendExpense): ExpenseRecord {
  return {
    id: e.id,
    timestamp: e.expenseDate,
    amount: Number(e.amount),
    category: CATEGORY_FROM_BACKEND[e.category],
    description: e.description,
    submittedBy: e.submittedBy,
    imageDataUrl: e.receiptUrl ?? undefined,
  };
}

export async function getExpenses(): Promise<ExpenseRecord[]> {
  const { expenses } = await apiClient.get<{ expenses: BackendExpense[] }>("/expenses");
  return expenses.map(mapExpense);
}

// The create response's expense object has no `submittedBy` (list is the
// only endpoint that joins + derives it) — callers should re-fetch via
// getExpenses() afterward rather than rely on this return value for display.
export async function createExpense(data: {
  amount: number;
  category: ExpenseCategory;
  description: string;
  imageDataUrl?: string;
}): Promise<void> {
  await apiClient.post("/expenses", {
    amount: data.amount,
    category: CATEGORY_TO_BACKEND[data.category],
    description: data.description,
    receiptUrl: data.imageDataUrl,
  });
}
