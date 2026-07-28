import { Order } from "../staff/(dashboard)/types";
import { computeStatsFromOrders } from "../staff/(dashboard)/localOrders";
import { groupItems } from "./groupItems";
import { Package } from "../staff/(dashboard)/neworder/types";

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
  return orders.filter((o) => o.status !== "Claimed" && o.status !== "Cancelled").length;
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

// Same "Paid, not Cancelled" revenue rule as computeStatsFromOrders — an
// average built on any other order set would disagree with every other
// revenue figure in the app for no good reason.
export function getAverageOrderValue(orders: Order[]): number {
  const paidOrders = orders.filter((o) => o.payStatus === "Paid" && o.status !== "Cancelled");
  if (paidOrders.length === 0) return 0;
  const total = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  return total / paidOrders.length;
}

export interface BestSellingPackage {
  name: string;
  quantitySold: number;
}

// Aggregates real Order.items data (drop-off packages) — not inventory
// supply sales, which no entity in the app currently tracks. See
// project_wrlms_known_issues for the reasoning.
//
// Filters to a POSITIVE match against the current packages list (not a
// negative "exclude service-shaped strings" check) — this is what keeps
// service order items (e.g. "Casual colored (Wash & Dry, 2kg)") out of a
// card labeled "Best Selling Packages", without relying on a brittle
// pattern match that could misfire on a future package name.
//
// Side effect, intended: a deleted package's historical orders stop
// appearing here too, since its name no longer matches anything in the
// current list. That's correct for a "what's selling from the current
// catalog" card — see project_wrlms_known_issues.
export function getBestSellingPackages(
  orders: Order[],
  packages: Package[],
  limit = 5
): BestSellingPackage[] {
  const currentPackageNames = new Set(packages.map((p) => p.name));
  const allItems = orders.flatMap((o) => o.items || []);
  return groupItems(allItems)
    .filter((g) => currentPackageNames.has(g.name))
    .map((g) => ({ name: g.name, quantitySold: g.qty }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

export interface DropOffSummaryRow {
  name: string;
  price: number;
  totalOrders: number;
  totalPrice: number;
}

// Mirrors Shift Handover's inline dropOffSummary/getItemQuantity logic
// exactly. Deliberately NOT extracted into one shared function that Staff's
// Shift Handover would also call — that would mean modifying working,
// merged Staff code for a refactor-only reason unrelated to what this page
// needs. See project_wrlms_known_issues for the tracked duplication note.
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
  // Revenue total (₱ per package) — same "Paid, not Cancelled" rule as
  // computeStatsFromOrders in localOrders.ts, so this never disagrees with
  // Dashboard's sales figure.
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
