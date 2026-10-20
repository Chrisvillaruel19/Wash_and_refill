import { prisma } from "../../lib/prisma.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { AuditAction, OrderStatus, PaymentMethod } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { getAvailableToWithdraw } from "../withdrawal/earnings.util.js";

const refundRepository = new RefundRepository();

const peso = (n: number) => `₱${n.toFixed(2)}`;

// The staff member on duty hands an approved cash refund (claimed order,
// e.g. damaged items) to the customer from the drawer. From now on the cash
// is out of the drawer math: their Shift Handover shows it as "Refunds given
// to customers" and expects that much less cash, and their Dashboard shift
// sales show it as a deduction (the order's sale record itself never
// changes). The route
// already requires a Staff member with an open shift (requireActiveShift).
export async function payOutRefundService(userId: string, refundId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Must be the first statement — see drawer-lock.ts. This changes the
      // drawer's expected cash, like a withdrawal.
      await acquireDrawerLock(tx);

      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { order: { select: { status: true, customerName: true } }, user: { select: { name: true } } },
      });
      if (!refund) return { notFound: true } as const;
      if (refund.method !== PaymentMethod.CASH || refund.order.status !== OrderStatus.CLAIMED) {
        return { conflict: "Only an approved cash refund for a claimed order is handed over from the drawer." } as const;
      }
      if (refund.paidOutAt) {
        return { conflict: "This refund was already given to the customer." } as const;
      }

      // The bills have to physically be there. Same "drawer now" as the
      // withdrawal math (see getAvailableToWithdraw): the starting cash, the
      // last count's leftover not yet withdrawn, and the open shift's net
      // cash — not just the float plus the open shift.
      const amount = Number(refund.amount);
      const available = await getAvailableToWithdraw(tx);
      const inDrawer =
        (Math.round(available.startingCash * 100) +
          Math.round((available.cash.lastShift?.available ?? 0) * 100) +
          Math.round(available.cash.openShift * 100)) /
        100;
      if (Math.round(amount * 100) > Math.round(inDrawer * 100)) {
        return {
          conflict: `The drawer should only have ${peso(inDrawer)} — not enough to give ${peso(amount)}. Ask the Admin.`,
        } as const;
      }

      if ((await refundRepository.markPaidOut(refundId, userId, tx)) === 0) {
        return { conflict: "This refund was already given to the customer." } as const;
      }

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.REFUND,
        module: "Order",
        description: `Gave ${peso(amount)} cash refund to ${refund.order.customerName} from the drawer (approved by ${refund.user.name}) — ${refund.reason}`,
        newValue: { refundId, amount, paidOut: true },
      });

      return { amount } as const;
    });

    if ("notFound" in result) return { code: 404, status: "error", message: "Refund not found" };
    if ("conflict" in result) return { code: 409, status: "error", message: result.conflict };
    return { code: 200, status: "success", message: "Refund given to the customer", data: result };
  } catch (error) {
    console.error("payOutRefundService error", error);
    return { code: 500, status: "error", message: "Unable to record the refund payout" };
  }
}

// Approved cash refunds still waiting to be handed to customers — shown to
// every staff member (whoever is on duty when the customer comes back pays).
export async function listPendingRefundPayoutsService() {
  try {
    const rows = await refundRepository.findPendingPayouts();
    return {
      code: 200,
      status: "success",
      message: "Pending refund payouts retrieved successfully",
      data: {
        payouts: rows.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          reason: r.reason,
          approvedAt: r.createdAt,
          approvedBy: r.user.name,
          orderId: r.order.id,
          customerName: r.order.customerName,
          customerPhone: r.order.customerPhone,
          orderTotal: Number(r.order.totalAmount),
        })),
      },
    };
  } catch (error) {
    console.error("listPendingRefundPayoutsService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve pending refund payouts" };
  }
}
