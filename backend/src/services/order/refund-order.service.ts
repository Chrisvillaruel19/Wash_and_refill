import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import {
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
  AuditAction,
  WithdrawalSource,
} from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { getAvailableToWithdraw } from "../withdrawal/earnings.util.js";

const orderRepository = new OrderRepository();
const refundRepository = new RefundRepository();
const withdrawalRepository = new WithdrawalRepository();

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
// keep matching what they recorded. Money always goes back the way the
// customer paid (cash → cash, GCash → GCash), so each balance adds up alone:
//  - Cancelled order: Staff took the cash out of the drawer and set it aside
//    when they cancelled; once this marks it Refunded, Staff hand that money
//    to the customer (GCash goes back through GCash). Never a sale, so sales
//    and the earnings available to withdraw don't change.
//  - Claimed order: it was a sale, so today's sales go down by the refund
//    (see sumPaidRevenue); staff sales never change.
//      Cash: approved here, then the staff member on duty hands the cash to
//      the customer from the drawer and marks it given (pay-out-refund
//      .service.ts) — only then does it leave the drawer math, and their
//      Shift Handover shows it as "Refunds paid". Until then the cash is
//      still in the drawer but owed, so it isn't withdrawable.
//      GCash: the Admin sends it from the shop's GCash; it comes off the
//      GCash balance right away.
// One order's refunds never exceed its total.
export async function refundOrderService(
  userId: string,
  id: string,
  data: { amount: number; method: PaymentMethod; reason: string }
) {
  const reason = data.reason.trim();
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Must be the first statement — see drawer-lock.ts. A claimed order's
      // refund comes out of the withdrawable earnings read below.
      await acquireDrawerLock(tx);
      // Then lock this order's row, so two refunds of the same order at
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

      // Paid back the way the customer paid (no record = Cash, as everywhere).
      const paidBy = existing.paymentMethod ?? PaymentMethod.CASH;
      const paidByLabel = paidBy === PaymentMethod.GCASH ? "GCash" : "cash";
      if (data.method !== paidBy) {
        return {
          notEligible: true as const,
          message: `This order was paid by ${paidByLabel}, so it's refunded by ${paidByLabel} too.`,
        };
      }

      // A claimed order's cash refund waits for the staff member on duty to
      // hand it over from the drawer (payout); everything else is settled
      // right now.
      const awaitsPayout = existing.status === OrderStatus.CLAIMED && paidBy === PaymentMethod.CASH;
      const refund = await refundRepository.create(
        {
          orderId: id,
          userId,
          amount: data.amount,
          method: data.method,
          reason,
          paidOutAt: awaitsPayout ? null : new Date(),
        },
        tx
      );

      // A claimed order's GCash refund comes off the shop's GCash balance,
      // recorded in full as a GCash withdrawal linked to this refund; if
      // it's more than what's there, later GCash sales fill the gap first.
      let fromEarnings = 0;
      if (existing.status === OrderStatus.CLAIMED && paidBy === PaymentMethod.GCASH) {
        const available = await getAvailableToWithdraw(tx);
        fromEarnings = Math.min(toCents(data.amount), Math.max(0, toCents(available.gcash.total))) / 100;
        await withdrawalRepository.create(
          {
            userId,
            amount: data.amount,
            reason: `Refund to ${existing.customerName} — ${reason}`,
            remainingCash: (toCents(available.gcash.total) - toCents(fromEarnings)) / 100,
            withdrawalDate: new Date(),
            source: WithdrawalSource.GCASH,
            refundId: refund.id,
          },
          tx
        );
      }
      const fromPastEarnings =
        existing.status === OrderStatus.CLAIMED && paidBy === PaymentMethod.GCASH
          ? (toCents(data.amount) - toCents(fromEarnings)) / 100
          : 0;

      const refundedNow = alreadyRefunded + data.amount;
      const kind = existing.status === OrderStatus.CANCELLED ? "cancelled" : "claimed";
      const moneyNote = awaitsPayout
        ? " (staff on duty to hand the cash to the customer from the drawer)"
        : existing.status !== OrderStatus.CLAIMED
          ? ""
          : fromPastEarnings > 0
            ? ` (${peso(fromEarnings)} from the GCash balance, ${peso(fromPastEarnings)} from GCash already withdrawn)`
            : " (from the GCash balance)";
      await writeAuditLog(tx, {
        userId,
        action: AuditAction.REFUND,
        module: "Order",
        description: `${awaitsPayout ? "Approved refund of" : "Refunded"} ${peso(data.amount)} by ${paidByLabel} to ${existing.customerName} for ${kind} order${moneyNote} — ${reason}`,
        newValue: {
          refundId: refund.id,
          amount: data.amount,
          method: data.method,
          reason,
          totalRefunded: refundedNow,
          orderTotal: total,
          awaitsPayout,
          ...(fromPastEarnings > 0 || fromEarnings > 0 ? { fromEarnings, fromPastEarnings } : {}),
        },
      });

      return { refund, totalRefunded: refundedNow, awaitsPayout, fromEarnings, fromPastEarnings } as const;
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
      data: {
        refund: result.refund,
        totalRefunded: result.totalRefunded,
        awaitsPayout: result.awaitsPayout,
        fromEarnings: result.fromEarnings,
        fromPastEarnings: result.fromPastEarnings,
      },
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
