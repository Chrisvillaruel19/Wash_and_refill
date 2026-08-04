import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { refreshStockStatus } from "../inventory/stock-status.util.js";
import { isCancellable } from "./order-status-flow.util.js";
import { OrderStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();
const inventoryRepository = new InventoryRepository();

export async function cancelOrderService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (!isCancellable(existing.status)) {
        return {
          notCancellable: true as const,
          message:
            existing.status === OrderStatus.CLAIMED
              ? "A claimed order can never be cancelled."
              : `Order is already ${existing.status} and cannot be cancelled.`,
        };
      }

      // Restore whatever this order actually consumed. The original
      // InventoryConsumption rows are left exactly as they are — they
      // remain a true historical record of what this order consumed before
      // being cancelled; restoring stock is a new event, not an erasure of
      // that history.
      const consumptions = await orderRepository.findConsumptionsByOrderId(id, tx);

      for (const consumption of consumptions) {
        await inventoryRepository.incrementQuantity(consumption.inventoryId, consumption.quantityUsed, tx);
        await refreshStockStatus(consumption.inventoryId, tx);
      }

      const order = await orderRepository.updateStatus(id, OrderStatus.CANCELLED, {}, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "Order",
        description: `Cancelled order (was ${existing.status}), inventory restored`,
        oldValue: { status: existing.status },
        newValue: { status: OrderStatus.CANCELLED },
      });

      return { order } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("notCancellable" in result) {
      return { code: 400, status: "error", message: result.message };
    }

    return {
      code: 200,
      status: "success",
      message: "Order cancelled successfully, inventory restored",
      data: { order: result.order },
    };
  } catch (error) {
    console.error("cancelOrderService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to cancel order",
    };
  }
}
