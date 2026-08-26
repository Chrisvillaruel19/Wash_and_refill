import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { refreshStockStatus } from "../inventory/stock-status.util.js";
import { isCancellable, canModifyOrder } from "./order-status-flow.util.js";
import { OrderStatus, AuditAction, Role } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();
const inventoryRepository = new InventoryRepository();

export async function cancelOrderService(userId: string, id: string, actorRole?: Role) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (!canModifyOrder(existing.userId, userId, actorRole)) {
        return {
          forbidden: true as const,
          message: "You can only cancel orders you created.",
        };
      }

      if (!isCancellable(existing.status)) {
        return {
          notCancellable: true as const,
          message:
            existing.status === OrderStatus.CLAIMED
              ? "A claimed order can never be cancelled."
              : `Order is already ${existing.status} and cannot be cancelled.`,
        };
      }

      // A paid order becomes claimable into a Shift Handover as soon as it's
      // PAID and non-CANCELLED (see lockUnclaimedPaidIds) — independent of
      // its own status, so a PENDING/IN_PROGRESS/READY order can already be
      // sitting inside an already-submitted (and thus frozen-total) handover
      // by the time someone tries to cancel it here. Same reasoning as
      // reverse-order-payment.service.ts and update-expense.service.ts:
      // cancelling now would restore inventory and change the order's status
      // while the closed handover's revenue total silently keeps counting it.
      if (existing.shiftHandoverId !== null) {
        return {
          alreadyClaimed: true as const,
          message:
            "This order has already been reconciled in a Shift Handover and can no longer be cancelled.",
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
    if ("forbidden" in result) {
      return { code: 403, status: "error", message: result.message };
    }
    if ("notCancellable" in result) {
      return { code: 400, status: "error", message: result.message };
    }
    if ("alreadyClaimed" in result) {
      return { code: 409, status: "error", message: result.message };
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
