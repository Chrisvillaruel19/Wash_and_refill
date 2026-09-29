import { OrderRepository } from "../../repositories/order.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { lowStockInventoryService } from "../inventory/index.js";
import { getBusinessDateOnly, getBusinessDayRange } from "../../lib/business-timezone.js";
import { PaymentMethod, Role } from "../../../generated/prisma/client.js";

const orderRepository = new OrderRepository();
const userRepository = new UserRepository();
const packageRepository = new PackageRepository();
const expenseRepository = new ExpenseRepository();
const attendanceRepository = new AttendanceRepository();

const BEST_SELLING_LIMIT = 5;
const SALES_CHART_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" of the Manila business day an instant falls on.
function businessDayKey(instant: Date): string {
  return getBusinessDateOnly(instant).toISOString().slice(0, 10);
}

export async function getAdminDashboardService() {
  try {
    const now = new Date();
    const todayRange = getBusinessDayRange(now);
    // Oldest day of the 7-day sales chart through the end of today.
    const chartRange = {
      start: getBusinessDayRange(new Date(now.getTime() - (SALES_CHART_DAYS - 1) * DAY_MS)).start,
      end: todayRange.end,
    };
    const [
      totalSales,
      claimedToday,
      statusCounts,
      packageLines,
      lowStockResult,
      employeeCount,
      activePackages,
      recentPaidOrders,
      expensesToday,
      todaysAttendance,
    ] = await Promise.all([
        orderRepository.sumPaidRevenue(todayRange),
        // Shop-wide, today only — every Staff's claims combined, matching
        // the same business-day boundary Staff's own "Claimed today" uses.
        // Distinct from statusCounts.CLAIMED below (all-time, still used
        // for Claim Monitoring's historical browsing), see
        // countClaimedInRange's own comment in order.repository.ts.
        orderRepository.countClaimedInRange(todayRange),
        orderRepository.countByStatus(),
        orderRepository.findPaidPackageLines(),
        lowStockInventoryService(),
        userRepository.countByRole(Role.STAFF),
        packageRepository.findAllActive(),
        orderRepository.findPaidInRange(chartRange),
        expenseRepository.sumInRange(todayRange),
        attendanceRepository.findForDate(getBusinessDateOnly(now)),
      ]);

    // One pass over the last 7 days of paid orders gives the chart, today's
    // Cash/GCash split, and yesterday's total for the comparison.
    const dailyTotals = new Map<string, number>();
    for (let i = SALES_CHART_DAYS - 1; i >= 0; i--) {
      dailyTotals.set(businessDayKey(new Date(now.getTime() - i * DAY_MS)), 0);
    }
    const todayKey = businessDayKey(now);
    let cashToday = 0;
    let gcashToday = 0;
    for (const order of recentPaidOrders) {
      if (!order.paymentDate) continue;
      const key = businessDayKey(order.paymentDate);
      const amount = Number(order.totalAmount);
      if (dailyTotals.has(key)) dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + amount);
      if (key === todayKey) {
        // No recorded method = Cash, same as Shift Handover's drawer math.
        if (order.paymentMethod === PaymentMethod.GCASH) gcashToday += amount;
        else cashToday += amount;
      }
    }
    const salesLast7Days = Array.from(dailyTotals, ([date, total]) => ({ date, total }));
    const yesterdaySales = salesLast7Days[salesLast7Days.length - 2]?.total ?? 0;

    const staffOnDuty = todaysAttendance.map((a) => ({
      name: a.user.name,
      timeIn: a.timeIn,
      timeOut: a.timeOut,
      status: a.status,
    }));

    const unclaimedOrders = statusCounts.PENDING + statusCounts.IN_PROGRESS + statusCounts.READY;

    // Aggregated by real packageId, not the frontend's frozen-string name
    // match — this also incidentally fixes the "renaming a package
    // fragments reporting" gap tracked in project known issues, since an
    // id is stable across a rename in a way a display name never was.
    // Only currently-active packages are shown, matching the frontend's
    // deliberate "what's selling from the current catalog" intent for
    // this specific card.
    const totalsByPackageId = new Map<string, number>();
    for (const line of packageLines) {
      if (!line.packageId) continue;
      totalsByPackageId.set(line.packageId, (totalsByPackageId.get(line.packageId) ?? 0) + line.quantity);
    }

    const activePackageNames = new Map(activePackages.map((p) => [p.id, p.packageName]));
    const bestSellingPackages = Array.from(totalsByPackageId.entries())
      .filter(([packageId]) => activePackageNames.has(packageId))
      .map(([packageId, quantitySold]) => ({
        name: activePackageNames.get(packageId) as string,
        quantitySold,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, BEST_SELLING_LIMIT);

    return {
      code: 200,
      status: "success",
      message: "Admin dashboard statistics retrieved successfully",
      data: {
        totalSales,
        unclaimedOrders,
        orderStatusCounts: {
          pending: statusCounts.PENDING,
          inProgress: statusCounts.IN_PROGRESS,
          ready: statusCounts.READY,
          // Today only, shop-wide — see claimedToday above. Pending/
          // InProgress/Ready intentionally stay all-time (current backlog,
          // not "today's activity") and are unchanged.
          claimed: claimedToday,
        },
        bestSellingPackages,
        lowStockCount: lowStockResult.data?.items.length ?? 0,
        employeeCount,
        cashSalesToday: cashToday,
        gcashSalesToday: gcashToday,
        yesterdaySales,
        expensesToday,
        salesLast7Days,
        staffOnDuty,
      },
    };
  } catch (error) {
    console.error("getAdminDashboardService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve admin dashboard statistics",
    };
  }
}
