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
    | "withdrawal"
    | "autoclockout";
  message: string;
  timestamp: string;
}

export type OrderStatus = "Pending" | "In progress" | "Ready" | "Claimed" | "Cancelled";
export type PayStatus = "Paid" | "UnPaid";
export type PaymentMethod = "Cash" | "GCash";

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
  // Real, sortable ISO timestamp — added for shift-scoping (Shift Handover
  // filters orders by this, not by the display-only date/time strings above).
  // Optional because orders created before this field existed won't have it;
  // those are treated as outside any shift-scoped window rather than guessed.
  createdAt?: string;
  // How the customer paid. Optional because orders created before this field
  // existed won't have it — those are treated as Cash for cash-drawer math
  // (matching how every order was already implicitly treated before this
  // field existed), not silently excluded.
  paymentMethod?: PaymentMethod;
  // null = not yet reconciled by any Shift Handover. Present on the real
  // backend response but previously unmapped — Shift Handover is the first
  // consumer that needs it (its "unclaimed" definition, not a timestamp
  // window). undefined for records mapped before this field existed.
  shiftHandoverId?: string | null;
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
  // True when the system closed this record automatically because it sat
  // clocked-in past MAX_SESSION_HOURS (a forgotten clock-out), rather than
  // the staff member actually clocking out. Kept visible, never hidden, so
  // Admin can manually correct hours/payroll for that day.
  autoClosed?: boolean;
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
  // null = not yet reconciled by any Shift Handover. See Order.shiftHandoverId.
  shiftHandoverId?: string | null;
  imageDataUrl?: string;
}

export interface ShiftHandoverRecord {
  id: string;
  timestamp: string;
  staffName: string;
  cashDrawer: number;
  laundrySales: number;
  supplySales: number;
  // Revenue from custom per-kg services (rugs, carpets, bulk items) — split
  // out from supplySales, which used to lump the two together as "Other
  // sales". Optional because records submitted before this field existed
  // won't have it; treat as 0 (unknown/not broken out), not fabricated.
  customServiceSales?: number;
  // Revenue paid via GCash/digital wallet rather than cash — informational
  // only, already excluded from expectedCash below (digital payments never
  // touch the physical drawer). Optional for the same legacy-record reason.
  digitalSales?: number;
  withdrawals: number;
  expense: number;
  expectedCash: number;
  actualCashCounted: number;
  shortage: number;
  notes: string;
}