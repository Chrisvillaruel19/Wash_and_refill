import { Order } from "../staff/(dashboard)/types";
import { computeStatsFromOrders } from "../staff/(dashboard)/localOrders";
import { groupItems } from "./groupItems";

export interface OrderStatusCounts {
  pending: number;
  inProgress: number;
  ready: number;
  claimed: number;
}

export function getOrderStatusCounts(orders: Order[]): OrderStatusCounts {
  return {
    pending: orders.filter((o) => o.status === "Pending").length,
    inProgress: orders.filter((o) => o.status === "In progress").length,
    ready: orders.filter((o) => o.status === "Ready").length,
    claimed: orders.filter((o) => o.status === "Claimed").length,
  };
}

export function getUnclaimedOrdersCount(orders: Order[]): number {
  return orders.filter((o) => o.status !== "Claimed").length;
}

// Wraps computeStatsFromOrders (localOrders.ts) rather than recomputing, so
// Admin and Staff never show two different numbers for the same concept.
// NOTE: this currently returns the SAME unfiltered figure Staff's Dashboard
// already shows as "Today's Sales" — it sums every order ever stored, not
// just ones dated today (there's no date-boundary logic anywhere in the
// codebase yet to filter by). Step 10 (Sales) may need a real cash-drawer
// figure with actual date filtering; if so, that should be a separate,
// distinctly-labeled function here — not a retrofit of this one, which
// Dashboard depends on matching Staff's existing number exactly.
export function getTotalCashToday(orders: Order[]): number {
  return computeStatsFromOrders(orders).todaysSales;
}

export interface BestSellingPackage {
  name: string;
  quantitySold: number;
}

// Aggregates real Order.items data (drop-off packages) — not inventory
// supply sales, which no entity in the app currently tracks. See
// project_wrlms_known_issues for the reasoning.
export function getBestSellingPackages(orders: Order[], limit = 5): BestSellingPackage[] {
  const allItems = orders.flatMap((o) => o.items || []);
  return groupItems(allItems)
    .map((g) => ({ name: g.name, quantitySold: g.qty }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}
