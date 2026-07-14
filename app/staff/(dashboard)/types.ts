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
  type: "update" | "restock" | "add";
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