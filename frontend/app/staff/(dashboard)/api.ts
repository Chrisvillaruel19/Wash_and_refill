import { DashboardStats, LowStockItem, ActivityLog, Order } from "./types";

// ⚠️ MOCK VERSION — returns fake data instead of calling a real backend.
// Once your backend is ready, replace this file with the real fetch version.

export async function getDashboardStats(): Promise<DashboardStats> {
  return {
    todaysSales: 8420,
    claimedToday: 1,
    ready: 1,
    lowStockCount: 2,
  };
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
  return [
    { id: "1", name: "Liquid detergent", quantityRemaining: 8, unit: "Sachet" },
    { id: "2", name: "Liquid detergent", quantityRemaining: 18, unit: "Bottle" },
    { id: "3", name: "Liquid detergent", quantityRemaining: 10, unit: "Liters" },
  ];
}

export async function getRecentActivity(): Promise<ActivityLog[]> {
  return [
    {
      id: "1",
      type: "update",
      message: "Staff: Eleno has Updated stock: Soap 40 → 30",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      type: "update",
      message: "Staff: Eleno has Updated stocks: Downy Sachet 50 → 40",
      timestamp: new Date().toISOString(),
    },
    {
      id: "3",
      type: "add",
      message: "Staff: Eleno has Restocked stock: 30x Dishwashing",
      timestamp: new Date().toISOString(),
    },
  ];
}

export async function getOrders(): Promise<Order[]> {
  return [
    {
      id: "1",
      customer: "Mark crisler",
      contact: "0912-345-6789",
      time: "11:35 AM",
      date: "4/21/2026",
      amount: 296,
      payStatus: "Paid",
      status: "Ready",
    },
    {
      id: "2",
      customer: "Jemar lee",
      contact: "0916-315-6729",
      time: "12:14 PM",
      date: "4/11/2026",
      amount: 97,
      payStatus: "Paid",
      status: "In progress",
    },
    {
      id: "3",
      customer: "Rey Inoc",
      contact: "0922-512-1729",
      time: "10:27 AM",
      date: "4/11/2026",
      amount: 346,
      payStatus: "UnPaid",
      status: "Pending",
    },
  ];
}