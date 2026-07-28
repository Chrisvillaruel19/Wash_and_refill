import { Order, DashboardStats } from "./types";
import { addActivityLog } from "./localActivity";
import { applyOrderStockImpact } from "./localInventory";

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

  addActivityLog({
    type: "order",
    message: `${order.staffName || "Staff"} created a new order for ${order.customer}`,
  });
}

export function updateOrderStatus(
  orderId: string,
  newStatus: Order["status"],
  staffName?: string
): Order[] {
  const existing = getStoredOrders();
  const target = existing.find((order) => order.id === orderId);

  const updated = existing.map((order) =>
    order.id === orderId ? { ...order, status: newStatus } : order
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  if (target) {
    addActivityLog({
      type: "status",
      message: `${staffName || "Staff"} marked ${target.customer}'s order as ${newStatus}`,
    });
  }

  return updated;
}

export function cancelOrder(orderId: string, staffName?: string): Order[] {
  const existing = getStoredOrders();
  const target = existing.find((order) => order.id === orderId);
  if (!target || target.status === "Cancelled" || target.status === "Claimed") {
    return existing;
  }

  const updated = existing.map((order) =>
    order.id === orderId ? { ...order, status: "Cancelled" as const } : order
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Whatever this order would have consumed, give it back — it never
  // actually went out the door.
  applyOrderStockImpact(target.items || [], -1);

  addActivityLog({
    type: "status",
    message: `${staffName || "Staff"} cancelled ${target.customer}'s order`,
  });

  return updated;
}

export function computeStatsFromOrders(
  orders: Order[]
): Pick<DashboardStats, "todaysSales" | "claimedToday" | "ready"> {
  // Revenue totals only count money actually received for orders that
  // actually happened. UnPaid orders haven't been paid for yet, and
  // Cancelled orders never went through — neither belongs in a sales figure.
  const todaysSales = orders
    .filter((o) => o.payStatus === "Paid" && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.amount, 0);
  const claimedToday = orders.filter((o) => o.status === "Claimed").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  return { todaysSales, claimedToday, ready };
}