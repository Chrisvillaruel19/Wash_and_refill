// Backend-preparation seam: pages import computed stats (revenue, best
// sellers, drop-off breakdown) from here, not from localStats.ts directly.
// Today this just re-exports the existing computation functions unchanged;
// once a real API/backend can compute these server-side, only this file's
// internals need to change, not every page that displays these figures.
export {
  getOrderStatusCounts,
  getUnclaimedOrdersCount,
  getTotalCashToday,
  getAverageOrderValue,
  getBestSellingPackages,
  getDropOffSummary,
} from "../localStats";
export type { OrderStatusCounts, BestSellingPackage, DropOffSummaryRow } from "../localStats";
