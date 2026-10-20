import { prisma } from "../lib/prisma.js";
import { Prisma, PaymentMethod, OrderStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Refunds never change a staff member's sales. A refund of a claimed order
// lowers shop sales on the day it's approved; a cancelled order was never a
// sale, so its refund doesn't. Money side (see refund-order.service.ts): a
// claimed order's cash refund is handed over by staff from the drawer (a
// payout, reconciled by Shift Handover); a GCash one comes off the shop's
// GCash balance.
const notCancelledOrder = { order: { status: { not: OrderStatus.CANCELLED } } };

// A claimed order's cash refund the Admin approved that no staff member has
// handed to the customer yet — the cash is still in the drawer, but owed.
const pendingPayout = {
  method: PaymentMethod.CASH,
  paidOutAt: null,
  order: { status: OrderStatus.CLAIMED },
};
// Cash a staff member handed to a customer from the open drawer, not yet
// reconciled by a Shift Handover.
const unclaimedPayout = { paidOutById: { not: null }, shiftHandoverId: null };

export class RefundRepository {
  async create(
    data: {
      orderId: string;
      userId: string;
      amount: number;
      method: PaymentMethod;
      reason: string;
      // null = waiting for staff to hand over the cash (see schema.prisma).
      paidOutAt: Date | null;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.refund.create({ data });
  }

  async findPendingPayouts(tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({
      where: pendingPayout,
      select: {
        id: true,
        amount: true,
        reason: true,
        createdAt: true,
        user: { select: { name: true } },
        order: { select: { id: true, customerName: true, customerPhone: true, totalAmount: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async sumPendingPayouts(tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({ where: pendingPayout, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  // Staff hand over the cash: only a still-pending payout can be marked, so
  // two clicks (or two staff) can't both pay it. Returns how many changed.
  async markPaidOut(id: string, paidOutById: string, tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.updateMany({
      where: { id, ...pendingPayout },
      data: { paidOutAt: new Date(), paidOutById },
    });
    return result.count;
  }

  async findUnclaimedPayouts(tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({
      where: unclaimedPayout,
      select: {
        id: true,
        amount: true,
        reason: true,
        paidOutAt: true,
        paidOutBy: { select: { name: true } },
        order: { select: { customerName: true } },
      },
      orderBy: { paidOutAt: "asc" },
    });
  }

  // Cash refunds this staff member handed to customers since a moment (their
  // clock-in) — shown against their shift sales on the Staff Dashboard.
  async sumPaidOutByUserSince(userId: string, since: Date, tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({
      where: { paidOutById: userId, paidOutAt: { gte: since } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async sumUnclaimedPayouts(tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({ where: unclaimedPayout, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  // Cash refunds this staff member handed to customers within a period
  // (open-ended bounds allowed) — their own Sales report nets these out.
  async sumPaidOutByUserInRange(
    userId: string,
    params: { gte?: Date; lt?: Date },
    tx: PrismaClientOrTx = prisma
  ): Promise<number> {
    const result = await tx.refund.aggregate({
      where: {
        paidOutById: userId,
        ...(params.gte || params.lt
          ? { paidOutAt: { ...(params.gte ? { gte: params.gte } : {}), ...(params.lt ? { lt: params.lt } : {}) } }
          : { paidOutAt: { not: null } }),
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async findUnclaimedPayoutsForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({ where: { ...unclaimedPayout, paidOutById: userId }, select: { id: true } });
  }

  // Shift Handover's claim step — same pattern as orders/expenses/withdrawals.
  async lockUnclaimedPayoutIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Refund"
      WHERE "paidOutById" IS NOT NULL AND "shiftHandoverId" IS NULL
      FOR UPDATE
    `;
    return rows.map((r) => r.id);
  }

  async findByIds(ids: string[], tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return [];
    return tx.refund.findMany({ where: { id: { in: ids } } });
  }

  async claim(ids: string[], shiftHandoverId: string, tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return;
    await tx.refund.updateMany({ where: { id: { in: ids } }, data: { shiftHandoverId } });
  }

  // Everything refunded so far for one order — a new refund can never take
  // the total past what the customer paid.
  async sumForOrder(orderId: string, tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({ where: { orderId }, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  // Shop-wide sales reports (Admin dashboard chart): refunds given within a
  // period, on orders that counted as sales (not cancelled).
  async findSalesRefundsInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({
      where: { createdAt: { gte: range.start, lt: range.end }, ...notCancelledOrder },
      select: { amount: true, method: true, createdAt: true },
    });
  }

  // Refunds on orders that counted as sales within a period, per method.
  async sumSalesRefundsByMethodInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    const rows = await tx.refund.groupBy({
      by: ["method"],
      where: { createdAt: { gte: range.start, lt: range.end }, ...notCancelledOrder },
      _sum: { amount: true },
    });
    const of = (m: PaymentMethod) => Number(rows.find((r) => r.method === m)?._sum.amount ?? 0);
    return { cash: of(PaymentMethod.CASH), gcash: of(PaymentMethod.GCASH) };
  }

  // Shop-wide sales report total: refunds on orders that counted as sales,
  // given within a period (open-ended bounds allowed; none = all time).
  async sumSalesRefunds(
    params: { createdGte?: Date; createdLt?: Date },
    tx: PrismaClientOrTx = prisma
  ): Promise<number> {
    const result = await tx.refund.aggregate({
      where: {
        ...notCancelledOrder,
        ...(params.createdGte || params.createdLt
          ? {
              createdAt: {
                ...(params.createdGte ? { gte: params.createdGte } : {}),
                ...(params.createdLt ? { lt: params.createdLt } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
