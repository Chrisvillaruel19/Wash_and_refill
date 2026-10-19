import { OrderRepository } from "../../repositories/order.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { getBusinessDayRangeForDate } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();
const refundRepository = new RefundRepository();

interface BreakdownRow {
  id: string;
  name: string;
  totalQuantity: number;
  totalAmount: number;
}

export async function getSalesBreakdownService(params: {
  shiftHandoverId?: string;
  dateFrom?: string;
  dateTo?: string;
  // Set for Staff callers — they only ever see their own sales.
  userId?: string;
}) {
  try {
    // dateFrom/dateTo are Manila calendar dates ("YYYY-MM-DD"), not UTC
    // instants — resolved against the actual Manila business day, same
    // rule as Attendance/Dashboard's "today" (see business-timezone.ts).
    const rangeStart = params.dateFrom ? getBusinessDayRangeForDate(params.dateFrom).start : undefined;
    const rangeEnd = params.dateTo ? getBusinessDayRangeForDate(params.dateTo).end : undefined;
    const [orders, totalRefunds] = await Promise.all([
      orderRepository.findPaidWithDetails({
        shiftHandoverId: params.shiftHandoverId,
        userId: params.userId,
        paymentDateGte: rangeStart,
        paymentDateLt: rangeEnd,
      }),
      // Refunds given in the same date range — the sales above are never
      // reduced, so the report shows Sales − Refunds = Net Sales instead.
      // Shop-wide only: refunds are the Admin's (paid from the shop's
      // earnings), so a staff member's own sales and a single shift's report
      // never include them.
      params.userId || params.shiftHandoverId
        ? Promise.resolve(0)
        : refundRepository.sumSalesRefunds({ createdGte: rangeStart, createdLt: rangeEnd }),
    ]);

    // Same PAID + non-CANCELLED + paymentDate-range order set the breakdown
    // below is already built from — reused as-is (no second query) so a
    // caller needing "total sales" / "average order value" for this exact
    // range gets it from the same authoritative dataset, instead of
    // re-deriving it client-side from a differently-scoped order array.
    const totalPaidAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const paidOrderCount = orders.length;

    const packageTotals = new Map<string, BreakdownRow>();
    const supplyTotals = new Map<string, BreakdownRow>();

    for (const order of orders) {
      for (const detail of order.orderDetails) {
        // Summed from each line's own recorded subtotal, not
        // quantity × today's catalog price — accurate even if a package's
        // or item's price has since changed.
        const amount = Number(detail.subtotal);

        if (detail.packageId && detail.package) {
          const existing = packageTotals.get(detail.packageId) ?? {
            id: detail.packageId,
            name: detail.package.packageName,
            totalQuantity: 0,
            totalAmount: 0,
          };
          existing.totalQuantity += detail.quantity;
          existing.totalAmount += amount;
          packageTotals.set(detail.packageId, existing);
        } else if (detail.inventoryId && detail.inventory) {
          const existing = supplyTotals.get(detail.inventoryId) ?? {
            id: detail.inventoryId,
            name: detail.inventory.itemName,
            totalQuantity: 0,
            totalAmount: 0,
          };
          existing.totalQuantity += detail.quantity;
          existing.totalAmount += amount;
          supplyTotals.set(detail.inventoryId, existing);
        }
      }
    }

    return {
      code: 200,
      status: "success",
      message: "Sales breakdown retrieved successfully",
      data: {
        packageBreakdown: Array.from(packageTotals.values()),
        supplyBreakdown: Array.from(supplyTotals.values()),
        totalPaidAmount,
        paidOrderCount,
        totalRefunds,
        netSales: totalPaidAmount - totalRefunds,
      },
    };
  } catch (error) {
    console.error("getSalesBreakdownService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve sales breakdown",
    };
  }
}
