import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { OrderStatus, PaymentStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();

export async function markOrderPaidService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (existing.status === OrderStatus.CANCELLED) {
        return {
          notEligible: true as const,
          message: "A cancelled order cannot be marked as paid.",
        };
      }

      if (existing.paymentStatus === PaymentStatus.PAID) {
        return {
          alreadyPaid: true as const,
          message: "Order is already paid.",
        };
      }

      const paymentDate = new Date();
      const totalAmount = Number(existing.totalAmount);

      // Conditional on paymentStatus still being UNPAID at write time —
      // closes the race the plain findById-then-update above can't: two
      // concurrent Mark as Paid requests reading the same UNPAID snapshot
      // would otherwise both pass the check above and both write.
      const updateResult = await orderRepository.updatePaymentStatusIfCurrentlyIs(
        id,
        PaymentStatus.UNPAID,
        { paymentStatus: PaymentStatus.PAID, paymentDate, amountPaid: totalAmount },
        tx
      );
      if (updateResult.count === 0) {
        return { alreadyPaid: true as const, message: "Order is already paid." };
      }
      const order = await orderRepository.findById(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.PAYMENT,
        module: "Order",
        description: `Order marked as paid (was ${existing.paymentStatus})`,
        oldValue: {
          paymentStatus: existing.paymentStatus,
          paymentDate: existing.paymentDate,
          amountPaid: Number(existing.amountPaid),
        },
        newValue: { paymentStatus: PaymentStatus.PAID, paymentDate, amountPaid: totalAmount },
      });

      return { order } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("notEligible" in result) {
      return { code: 400, status: "error", message: result.message };
    }
    if ("alreadyPaid" in result) {
      return { code: 409, status: "error", message: result.message };
    }

    return {
      code: 200,
      status: "success",
      message: "Order marked as paid",
      data: { order: result.order },
    };
  } catch (error) {
    console.error("markOrderPaidService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to mark order as paid",
    };
  }
}
