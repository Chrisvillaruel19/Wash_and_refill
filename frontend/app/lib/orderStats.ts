import { Order } from "../staff/(dashboard)/types";

// Pure order-statistics helpers, fed by real backend data (getOrders())
// from every caller. No localStorage, no fake data.

// Revenue totals only count money actually received for orders that
// actually happened — UnPaid orders haven't been paid for yet, and
// Cancelled orders never went through.
export function getTotalCashToday(orders: Order[]): number {
  return orders
    .filter((o) => o.payStatus === "Paid" && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.amount, 0);
}

// Same "Paid, not Cancelled" revenue rule as getTotalCashToday — an average
// built on any other order set would disagree with every other revenue
// figure in the app for no good reason.
export function getAverageOrderValue(orders: Order[]): number {
  const paidOrders = orders.filter((o) => o.payStatus === "Paid" && o.status !== "Cancelled");
  if (paidOrders.length === 0) return 0;
  const total = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  return total / paidOrders.length;
}

