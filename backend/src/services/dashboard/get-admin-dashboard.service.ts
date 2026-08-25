import { OrderRepository } from "../../repositories/order.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { lowStockInventoryService } from "../inventory/index.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";
import { Role } from "../../../generated/prisma/client.js";

const orderRepository = new OrderRepository();
const userRepository = new UserRepository();
const packageRepository = new PackageRepository();

const BEST_SELLING_LIMIT = 5;

export async function getAdminDashboardService() {
  try {
    const todayRange = getBusinessDayRange();
    const [totalSales, statusCounts, packageLines, lowStockResult, employeeCount, activePackages] =
      await Promise.all([
        orderRepository.sumPaidRevenue(todayRange),
        orderRepository.countByStatus(),
        orderRepository.findPaidPackageLines(),
        lowStockInventoryService(),
        userRepository.countByRole(Role.STAFF),
        packageRepository.findAllActive(),
      ]);

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
          claimed: statusCounts.CLAIMED,
        },
        bestSellingPackages,
        lowStockCount: lowStockResult.data?.items.length ?? 0,
        employeeCount,
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
