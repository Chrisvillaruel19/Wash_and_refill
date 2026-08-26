import { OrderRepository } from "../../repositories/order.repository.js";
import { lowStockInventoryService } from "../inventory/index.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();

// Deliberately does not re-embed the full orders list — the frontend's
// OrdersTable already has its own source via the existing GET /orders
// endpoint (Module 5); duplicating that data here would just be two
// endpoints serving the same rows.
export async function getStaffDashboardService() {
  try {
    const todayRange = getBusinessDayRange();
    const [todaysSales, claimedToday, statusCounts, lowStockResult] = await Promise.all([
      orderRepository.sumPaidRevenue(todayRange),
      orderRepository.countClaimedInRange(todayRange),
      orderRepository.countByStatus(),
      lowStockInventoryService(),
    ]);

    return {
      code: 200,
      status: "success",
      message: "Staff dashboard statistics retrieved successfully",
      data: {
        todaysSales,
        claimedToday,
        ready: statusCounts.READY,
        lowStockItems: lowStockResult.data?.items ?? [],
      },
    };
  } catch (error) {
    console.error("getStaffDashboardService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve staff dashboard statistics",
    };
  }
}
