import { OrderRepository } from "../../repositories/order.repository.js";
import { getBusinessDayRangeForDate } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();

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
}) {
  try {
    const orders = await orderRepository.findPaidWithDetails({
      shiftHandoverId: params.shiftHandoverId,
      // dateFrom/dateTo are Manila calendar dates ("YYYY-MM-DD"), not UTC
      // instants — resolved against the actual Manila business day, same
      // rule as Attendance/Dashboard's "today" (see business-timezone.ts).
      paymentDateGte: params.dateFrom ? getBusinessDayRangeForDate(params.dateFrom).start : undefined,
      paymentDateLt: params.dateTo ? getBusinessDayRangeForDate(params.dateTo).end : undefined,
    });

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
