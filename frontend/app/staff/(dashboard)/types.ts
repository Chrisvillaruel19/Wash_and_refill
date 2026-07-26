export interface DashboardStats {
  todaysSales: number;
  claimedToday: number;
  ready: number;
  lowStockCount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  quantityRemaining: number;
  unit: string;
}

export interface ActivityLog {
  id: string;
  type:
    | "update"
    | "restock"
    | "add"
    | "order"
    | "expense"
    | "clockin"
    | "clockout"
    | "status"
    | "employee"
    | "delete"
    | "withdrawal";
  message: string;
  timestamp: string;
}

export type OrderStatus = "Pending" | "In progress" | "Ready" | "Claimed";
export type PayStatus = "Paid" | "UnPaid";

export interface Order {
  id: string;
  customer: string;
  contact: string;
  time: string;
  date: string;
  amount: number;
  payStatus: PayStatus;
  status: OrderStatus;
  items?: string[];
  staffName?: string;

}
export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  lowStockAlert: number;
  unit: string;
  price: number;
}

export interface AttendanceRecord {
  id: string;
  staffName: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  totalHours: number | null;
  status: "Present";
}

export type ExpenseCategory =
  | "Supplies & Materials"
  | "Utilities"
  | "Equipment Repair"
  | "Rent"
  | "Other";

export interface ExpenseRecord {
  id: string;
  timestamp: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  submittedBy: string;
  imageDataUrl?: string;
}

export interface ShiftHandoverRecord {
  id: string;
  timestamp: string;
  staffName: string;
  cashDrawer: number;
  laundrySales: number;
  supplySales: number;
  withdrawals: number;
  expense: number;
  expectedCash: number;
  actualCashCounted: number;
  shortage: number;
  notes: string;
}