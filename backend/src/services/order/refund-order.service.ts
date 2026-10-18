import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { PaymentStatus, OrderStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();

// Admin-only: records that the money for a paid order that was later
// cancelled, or claimed but needing a refund (e.g. damaged items), has been
// handed back to the customer. Flips PAID -> REFUNDED
// and leaves amountPaid/paymentDate untouched as the record of what was
// originally paid — every revenue query only counts PAID orders, so a
// refunded order drops out of sales on its own.
export async function refundOrderService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      // Self-service orders are paid in full at checkout, never appear in
      // Laundry Monitoring, and have no screen that would show a refund.
      if (existing.isSelfService) {
        return {
          notEligible: true as const,
          message: "Self service orders cannot be refunded.",
        };
      }

      // Cancelled: the order never happened. Claimed: situational, e.g. the
      // customer's items came back damaged. Orders still in the shop
      // (Pending/In progress/Ready) are cancelled instead, not refunded.
      if (existing.status !== OrderStatus.CANCELLED && existing.status !== OrderStatus.CLAIMED) {
        return {
          notEligible: true as const,
          message: "Only cancelled or claimed orders can be refunded.",
        };
      }

      if (existing.paymentStatus !== PaymentStatus.PAID) {
        return {
          notEligible: true as const,
          message:
            existing.paymentStatus === PaymentStatus.REFUNDED
              ? "This order has already been refunded."
              : "This order was never paid, so there is nothing to refund.",
        };
      }

      // Conditional on paymentStatus still being PAID at write time — two
      // concurrent refund requests can't both succeed.
      const updateResult = await orderRepository.updatePaymentStatusIfCurrentlyIs(
        id,
        PaymentStatus.PAID,
        { paymentStatus: PaymentStatus.REFUNDED, paymentDate: existing.paymentDate },
        tx
      );
      if (updateResult.count === 0) {
        return { notEligible: true as const, message: "This order has already been refunded." };
      }
      const order = await orderRepository.findById(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.REFUND,
        module: "Order",
        // totalAmount, not amountPaid: amountPaid is the cash tendered at
        // checkout and can include the customer's change.
        description: `Refunded ₱${Number(existing.totalAmount).toFixed(2)} to ${existing.customer.customerName} for ${existing.status === OrderStatus.CLAIMED ? "claimed" : "cancelled"} order`,
        oldValue: { paymentStatus: existing.paymentStatus },
        newValue: { paymentStatus: PaymentStatus.REFUNDED },
      });

      return { order } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("notEligible" in result) {
      return { code: 409, status: "error", message: result.message };
    }

    return {
      code: 200,
      status: "success",
      message: "Order refunded",
      data: { order: result.order },
    };
  } catch (error) {
    console.error("refundOrderService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to refund order",
    };
  }
}
