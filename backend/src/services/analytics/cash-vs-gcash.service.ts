import { getOrderSummaryForRange } from "./order-summary.util.js";

// Cash vs. GCash split for a date range — reuses the exact exclusion rule
// already established for Shift Handover reconciliation (summarizeOrders,
// reconciliation.util.ts): GCash counts toward totalSales but never toward
// cashSalesTotal, matching physical drawer reality.
export async function cashVsGcashService(start: Date, end: Date) {
  try {
    const { cashSalesTotal, digitalSalesTotal, totalSales } = await getOrderSummaryForRange(start, end);

    return {
      code: 200,
      status: "success",
      message: "Cash vs GCash breakdown retrieved successfully",
      data: {
        range: { start, end },
        cashSalesTotal,
        gcashSalesTotal: digitalSalesTotal,
        totalSales,
      },
    };
  } catch (error) {
    console.error("cashVsGcashService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve cash vs GCash breakdown",
    };
  }
}
