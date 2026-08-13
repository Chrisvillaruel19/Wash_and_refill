import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { PaymentStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();

// Admin-only correction path: flips a PAID order back to UNPAID without
// touching amountPaid or any order/inventory data — the audit log below is
// the record of what changed and who did it, not a reason to also erase the
// figure itself.
export async function reverseOrderPaymentService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (existing.paymentStatus !== PaymentStatus.PAID) {
        return {
          notPaid: true as const,
          message: "Order is not currently paid.",
        };
      }

      // Once an order is claimed into a Shift Handover, that handover's
      // totals are computed once and frozen (see ShiftHandover model /
      // create-shift-handover.service.ts) — never recomputed later. Allowing
      // a reversal here would silently desync the order (UNPAID) from the
      // already-closed handover (which still counts it as paid revenue),
      // with no way to reconcile the two afterward. Block it instead of
      // trying to patch historical totals.
      if (existing.shiftHandoverId !== null) {
        return {
          alreadyClaimed: true as const,
          message: "This order has already been reconciled in a Shift Handover and can no longer have its payment reversed.",
        };
      }

      // Conditional on paymentStatus still being PAID at write time — same
      // race-closing pattern as Mark as Paid: two concurrent reversal
      // requests (or a reversal racing a mark-paid) can't both succeed.
      const updateResult = await orderRepository.updatePaymentStatusIfCurrentlyIs(
        id,
        PaymentStatus.PAID,
        { paymentStatus: PaymentStatus.UNPAID, paymentDate: null },
        tx
      );
      if (updateResult.count === 0) {
        return { notPaid: true as const, message: "Order is not currently paid." };
      }
      const order = await orderRepository.findById(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.PAYMENT,
        module: "Order",
        description: "Payment reversed to Unpaid",
        oldValue: { paymentStatus: existing.paymentStatus, paymentDate: existing.paymentDate },
        newValue: { paymentStatus: PaymentStatus.UNPAID, paymentDate: null },
      });

      return { order } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("notPaid" in result) {
      return { code: 409, status: "error", message: result.message };
    }
    if ("alreadyClaimed" in result) {
      return { code: 409, status: "error", message: result.message };
    }

    return {
      code: 200,
      status: "success",
      message: "Payment reversed to Unpaid",
      data: { order: result.order },
    };
  } catch (error) {
    console.error("reverseOrderPaymentService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to reverse payment",
    };
  }
}
