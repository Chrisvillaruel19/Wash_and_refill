import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { lowStockInventoryService } from "../inventory/index.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();
const attendanceRepository = new AttendanceRepository();
const refundRepository = new RefundRepository();

// Deliberately does not re-embed the full orders list — the frontend's
// OrdersTable already has its own source via the existing GET /orders
// endpoint (Module 5); duplicating that data here would just be two
// endpoints serving the same rows.
export async function getStaffDashboardService(userId: string) {
  try {
    const todayRange = getBusinessDayRange();
    // Staff see only their own paid sales for their current shift (since
    // clock-in) — the shop-wide total is Admin-only. Not clocked in = 0.
    const activeAttendance = await attendanceRepository.findActiveForUser(userId);
    const shiftStart = activeAttendance?.timeIn ?? null;
    const [myShiftSales, myShiftCashRefunds, myShiftGcashRefunds, claimedToday, statusCounts, lowStockResult] = await Promise.all([
      shiftStart
        ? orderRepository.sumPaidRevenue({ start: shiftStart, end: new Date(Date.now() + 60_000) }, prisma, userId)
        : Promise.resolve(0),
      // Cash refunds this staff member handed to customers this shift
      // (approved by the Admin) — the card shows sales minus these as net.
      shiftStart ? refundRepository.sumPaidOutByUserInRange(userId, { gte: shiftStart }) : Promise.resolve(0),
      // GCash refunds the Admin sent this shift on orders this staff member
      // took the payment for (their GCash sales are part of the total too).
      shiftStart ? refundRepository.sumGcashRefundsOnUserOrders(userId, { gte: shiftStart }) : Promise.resolve(0),
      orderRepository.countClaimedForUserInRange(userId, todayRange),
      orderRepository.countByStatus(),
      lowStockInventoryService(),
    ]);
    const myShiftRefundsPaid =
      (Math.round(myShiftCashRefunds * 100) + Math.round(myShiftGcashRefunds * 100)) / 100;

    return {
      code: 200,
      status: "success",
      message: "Staff dashboard statistics retrieved successfully",
      data: {
        myShiftSales,
        myShiftRefundsPaid,
        // The same refunds per method, for "After refunds: … (Cash) … (GCash)".
        myShiftCashRefunds,
        myShiftGcashRefunds,
        myShiftNetSales: (Math.round(myShiftSales * 100) - Math.round(myShiftRefundsPaid * 100)) / 100,
        onShift: shiftStart !== null,
        claimedToday,
        pending: statusCounts.PENDING,
        inProgress: statusCounts.IN_PROGRESS,
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
