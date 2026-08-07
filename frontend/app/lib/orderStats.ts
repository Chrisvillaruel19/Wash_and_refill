import { Order } from "../staff/(dashboard)/types";
import { Package } from "../staff/(dashboard)/neworder/types";

// Pure order-statistics helpers, fed by real backend data (getOrders() /
// getPackages()) from every caller. No localStorage, no fake data.

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

export interface DropOffSummaryRow {
  name: string;
  price: number;
  totalOrders: number;
  totalPrice: number;
}

// Order items are stored as either the plain package name ("Basic") or,
// when several of the same package were added to one order, with a
// quantity suffix ("Basic ×5"). Extracts the quantity either way.
function getItemQuantity(itemStr: string, name: string): number {
  if (itemStr === name) return 1;
  const prefix = `${name} ×`;
  if (itemStr.startsWith(prefix)) {
    const num = parseInt(itemStr.slice(prefix.length), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function getDropOffSummary(orders: Order[], packages: Package[]): DropOffSummaryRow[] {
  const paidOrders = orders.filter((o) => o.payStatus === "Paid" && o.status !== "Cancelled");
  return packages
    .map((pkg) => {
      const totalQty = paidOrders.reduce((sum, o) => {
        const orderQty = (o.items || []).reduce(
          (s, itemStr) => s + getItemQuantity(itemStr, pkg.name),
          0
        );
        return sum + orderQty;
      }, 0);
      return {
        name: pkg.name,
        price: pkg.price,
        totalOrders: totalQty,
        totalPrice: totalQty * pkg.price,
      };
    })
    .filter((p) => p.totalOrders > 0);
}
