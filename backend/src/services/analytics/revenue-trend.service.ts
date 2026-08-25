import { OrderRepository } from "../../repositories/order.repository.js";
import { getBusinessDateOnly } from "../../lib/business-timezone.js";
import { periodBucketKey, PeriodGrouping } from "./period-bucket.util.js";

const orderRepository = new OrderRepository();

export type { PeriodGrouping as RevenueTrendGrouping };

// Daily/weekly/monthly revenue trend for a date range. Fetches once and
// buckets in memory (order volumes here don't warrant a raw-SQL date_trunc
// query) using the same Manila business-date logic as everywhere else in
// this codebase — not a second, divergent timezone implementation.
export async function revenueTrendService(start: Date, end: Date, groupBy: PeriodGrouping) {
  try {
    const orders = await orderRepository.findPaidInRange(start, end);

    const totalsByBucket = new Map<string, number>();
    for (const order of orders) {
      if (!order.paymentDate) continue; // PAID orders always have one; guard for type safety only
      const key = periodBucketKey(getBusinessDateOnly(order.paymentDate), groupBy);
      totalsByBucket.set(key, (totalsByBucket.get(key) ?? 0) + Number(order.totalAmount));
    }

    const trend = Array.from(totalsByBucket.entries())
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      code: 200,
      status: "success",
      message: "Revenue trend retrieved successfully",
      data: { range: { start, end }, groupBy, trend },
    };
  } catch (error) {
    console.error("revenueTrendService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve revenue trend",
    };
  }
}
