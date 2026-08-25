import { OrderRepository } from "../../repositories/order.repository.js";

const orderRepository = new OrderRepository();

// Per-staff revenue totals for a date range — grouped in the service layer
// from a single fetch, same "repository fetches raw rows, service
// aggregates" convention used by findPaidPackageLines/summarizeOrders.
export async function revenueByStaffService(start: Date, end: Date) {
  try {
    const orders = await orderRepository.findPaidInRange(start, end);

    const totalsByStaff = new Map<string, { name: string; revenue: number; orderCount: number }>();
    for (const order of orders) {
      const existing = totalsByStaff.get(order.userId);
      const amount = Number(order.totalAmount);
      if (existing) {
        existing.revenue += amount;
        existing.orderCount += 1;
      } else {
        totalsByStaff.set(order.userId, { name: order.user.name, revenue: amount, orderCount: 1 });
      }
    }

    const byStaff = Array.from(totalsByStaff.entries())
      .map(([userId, totals]) => ({ userId, ...totals }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      code: 200,
      status: "success",
      message: "Revenue by staff retrieved successfully",
      data: { range: { start, end }, byStaff },
    };
  } catch (error) {
    console.error("revenueByStaffService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve revenue by staff",
    };
  }
}
