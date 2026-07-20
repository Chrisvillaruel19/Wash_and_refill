import { Order, DashboardStats } from "./types";

const STORAGE_KEY = "wrlms_orders";

export function getStoredOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredOrder(order: Order): void {
  if (typeof window === "undefined") return;
  const existing = getStoredOrders();
  const updated = [order, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateOrderStatus(orderId: string, newStatus: Order["status"]): Order[] {
  const existing = getStoredOrders();
  const updated = existing.map((order) =>
    order.id === orderId ? { ...order, status: newStatus } : order
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function computeStatsFromOrders(
  orders: Order[]
): Pick<DashboardStats, "todaysSales" | "claimedToday" | "ready"> {
  const todaysSales = orders.reduce((sum, o) => sum + o.amount, 0);
  const claimedToday = orders.filter((o) => o.status === "Claimed").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  return { todaysSales, claimedToday, ready };
}