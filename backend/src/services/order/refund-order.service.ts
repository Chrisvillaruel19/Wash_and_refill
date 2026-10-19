import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { PaymentStatus, PaymentMethod, OrderStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();
const refundRepository = new RefundRepository();

const toCents = (n: number) => Math.round(n * 100);
const peso = (n: number) => `₱${n.toFixed(2)}`;

// Admin-only: gives money back to a customer for a paid order. Staff never
// refund; they can only cancel Pending orders. Which orders, and how much:
//  - CANCELLED: always the full amount — it was cancelled before any
//    laundry was done, so nothing was delivered.
//  - CLAIMED: partial or full — only in special cases, e.g. damaged items.
//  - PENDING / IN_PROGRESS / READY: not refundable. A Pending order is
//    cancelled first; an unfinished one is finished and claimed first.
//
// Recorded as its own Refund transaction on the day it happens. The order's
// payment is never edited, so past sales reports and frozen Shift Handovers
// keep matching what they recorded. A refund never touches a staff member's
// cash drawer, Shift Handover or the GCash available to withdraw:
//  - Cancelled order: Staff took the cash out of the drawer and set it aside
//    when they cancelled; once this marks it Refunded, Staff hand that money
//    to the customer (GCash goes back through GCash). Never a sale, so sales
//    don't change either.
//  - Claimed order: the Admin pays it from the shop's earnings (cash already
//    withdrawn, or the shop's GCash) — no staff shift is affected. It was a
//    sale, so today's sales go down by the refund (see sumPaidRevenue).
// One order's refunds never exceed its total.
export async function refundOrderService(
  userId: string,
  id: string,
  data: { amount: number; method: PaymentMethod; reason: string }
) {
  const reason = data.reason.trim();
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock this order's row first, so two refunds of the same order at
      // once can't both pass the "not more than what's left" check below.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;

      const existing = await orderRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      // Self-service orders are paid in full at checkout, never appear in
      // Laundry Monitoring, and have no screen that would show a refund.
      if (existing.isSelfService) {
        return { notEligible: true as const, message: "Self service orders cannot be refunded." };
      }

      if (existing.paymentStatus !== PaymentStatus.PAID) {
        return {
          notEligible: true as const,
          message: "This order was never paid, so there is nothing to refund.",
        };
      }

      if (existing.status === OrderStatus.PENDING) {
        return {
          notEligible: true as const,
          message: "This order is still pending. Staff can cancel it first; then it can be refunded.",
        };
      }
      if (existing.status === OrderStatus.IN_PROGRESS || existing.status === OrderStatus.READY) {
        return {
          notEligible: true as const,
          message: "This order isn't finished yet. Finish and claim it first; then it can be refunded if needed.",
        };
      }

      const total = Number(existing.totalAmount);
      const alreadyRefunded = await refundRepository.sumForOrder(id, tx);
      const remainingCents = toCents(total) - toCents(alreadyRefunded);
      if (remainingCents <= 0) {
        return { notEligible: true as const, message: "This order has already been fully refunded." };
      }
      if (toCents(data.amount) > remainingCents) {
        return {
          notEligible: true as const,
          message: `Only ${peso(remainingCents / 100)} of this order can still be refunded.`,
        };
      }
      // Nothing was delivered on a cancelled order, so the customer gets
      // everything back in one refund — never part of it.
      if (existing.status === OrderStatus.CANCELLED && toCents(data.amount) !== remainingCents) {
        return {
          notEligible: true as const,
          message: `A cancelled order is refunded in full: ${peso(remainingCents / 100)}.`,
        };
      }

      // A cancelled order is paid back the way the customer paid: the cash
      // Staff set aside, or GCash through GCash.
      const paidBy = existing.paymentMethod ?? PaymentMethod.CASH;
      if (existing.status === OrderStatus.CANCELLED && data.method !== paidBy) {
        return {
          notEligible: true as const,
          message: `This cancelled order was paid by ${paidBy === PaymentMethod.GCASH ? "GCash" : "cash"}, so it's refunded the same way.`,
        };
      }

      const refund = await refundRepository.create(
        { orderId: id, userId, amount: data.amount, method: data.method, reason },
        tx
      );

      const refundedNow = alreadyRefunded + data.amount;
      const kind = existing.status === OrderStatus.CANCELLED ? "cancelled" : "claimed";
      await writeAuditLog(tx, {
        userId,
        action: AuditAction.REFUND,
        module: "Order",
        description: `Refunded ${peso(data.amount)} by ${data.method === PaymentMethod.GCASH ? "GCash" : "cash"} to ${existing.customerName} for ${kind} order — ${reason}`,
        newValue: {
          refundId: refund.id,
          amount: data.amount,
          method: data.method,
          reason,
          totalRefunded: refundedNow,
          orderTotal: total,
        },
      });

      return { refund, totalRefunded: refundedNow } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Order not found" };
    }
    if ("notEligible" in result) {
      return { code: 409, status: "error", message: result.message };
    }

    return {
      code: 201,
      status: "success",
      message: "Refund recorded",
      data: { refund: result.refund, totalRefunded: result.totalRefunded },
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
