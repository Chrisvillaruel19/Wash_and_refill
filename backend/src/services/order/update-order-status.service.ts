import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { isValidStatusTransition, canModifyOrder } from "./order-status-flow.util.js";
import { OrderStatus, AuditAction, Role } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();

export async function updateOrderStatusService(
  userId: string,
  id: string,
  targetStatus: OrderStatus,
  actorRole?: Role
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (!canModifyOrder(existing.userId, userId, actorRole)) {
        return {
          forbidden: true as const,
          message: "You can only update orders you created.",
        };
      }

      if (!isValidStatusTransition(existing.status, targetStatus)) {
        return {
          invalidTransition: true as const,
          message: `Cannot move an order from ${existing.status} to ${targetStatus}. Status must progress one step at a time (PENDING → IN_PROGRESS → READY → CLAIMED), and cannot move backward.`,
        };
      }

      const extra = targetStatus === OrderStatus.CLAIMED ? { claimedDate: new Date() } : {};
      const updated = await orderRepository.updateStatus(id, targetStatus, extra, tx);

      // A claim gets its own dedicated AuditAction (matching the schema's
      // intent); every other status transition is a generic UPDATE — there
      // is no CANCEL action in the enum, and cancellation has its own
      // service/audit entry anyway.
      await writeAuditLog(tx, {
        userId,
        action: targetStatus === OrderStatus.CLAIMED ? AuditAction.CLAIM : AuditAction.UPDATE,
        module: "Order",
        description: `Order status changed from ${existing.status} to ${targetStatus}`,
        oldValue: { status: existing.status },
        newValue: { status: targetStatus },
      });

      return { order: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("forbidden" in result) {
      return { code: 403, status: "error", message: result.message };
    }
    if ("invalidTransition" in result) {
      return { code: 400, status: "error", message: result.message };
    }

    return {
      code: 200,
      status: "success",
      message: "Order status updated successfully",
      data: { order: result.order },
    };
  } catch (error) {
    console.error("updateOrderStatusService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update order status",
    };
  }
}
