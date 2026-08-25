import { getOrderSummaryForRange } from "./order-summary.util.js";

// Category split (Package / Service / Inventory) for a date range, reusing
// summarizeOrders (reconciliation.util.ts) — the same grouping already used
// by Shift Handover, not a reinvented rule.
export async function revenueByCategoryService(start: Date, end: Date) {
  try {
    const { laundryEarnings, supplySales, customServiceSales, totalSales } =
      await getOrderSummaryForRange(start, end);

    return {
      code: 200,
      status: "success",
      message: "Revenue by category retrieved successfully",
      data: {
        range: { start, end },
        laundryEarnings,
        supplySales,
        customServiceSales,
        totalSales,
      },
    };
  } catch (error) {
    console.error("revenueByCategoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve revenue by category",
    };
  }
}
