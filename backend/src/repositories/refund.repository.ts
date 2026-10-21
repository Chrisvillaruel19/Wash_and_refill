import { prisma } from "../lib/prisma.js";
import { Prisma, PaymentMethod, OrderStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// A claimed order's refund lowers shop sales on the day it's approved; a
// cancelled order was never a sale, so its refund doesn't. The order's own
// sale record never changes. Money side (see refund-order.service.ts): a
// claimed order's cash refund is handed over by staff from the drawer (a
// payout, reconciled by Shift Handover, and shown as a deduction from that
// staff member's shift sales); a GCash one comes off the shop's GCash.
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

  async sumUnclaimedPayouts(tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({ where: unclaimedPayout, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  // Cash refunds this staff member handed to customers within a period
  // (open-ended bounds allowed) — netted out of their own shift sales on the
  // Dashboard (since clock-in) and their Sales report (chosen dates).
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

  // GCash refunds given in the range on orders this staff member took the
  // payment for — they come off the shop's GCash, never a drawer, so no one
  // "pays them out", but they still reduce that staff member's shift sales.
  async sumGcashRefundsOnUserOrders(
    userId: string,
    params: { gte?: Date; lt?: Date },
    tx: PrismaClientOrTx = prisma
  ): Promise<number> {
    const result = await tx.refund.aggregate({
      where: {
        method: "GCASH",
        ...(params.gte || params.lt
          ? { createdAt: { ...(params.gte ? { gte: params.gte } : {}), ...(params.lt ? { lt: params.lt } : {}) } }
          : {}),
        order: { paidById: userId, status: { not: "CANCELLED" } },
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

  // GCash refunds not yet reconciled by a Shift Handover, on orders that
  // counted as sales. They never touch the drawer (the Admin sends them from
  // the shop's GCash) — the handover only shows its GCash after refunds.
  // `since` = the previous handover's end: refunds from before it belong to
  // shifts already closed, so they're never swept into this one.
  async findUnclaimedGcashRefunds(since: Date | null, tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({
      where: {
        method: PaymentMethod.GCASH,
        paidOutById: null,
        shiftHandoverId: null,
        ...notCancelledOrder,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      select: { id: true, amount: true, reason: true, createdAt: true, order: { select: { customerName: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  // Same rows as findUnclaimedGcashRefunds with `since` = the latest
  // handover's end (read in SQL, before the new handover exists), locked for
  // the handover's claim.
  async lockUnclaimedGcashRefundIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Refund" r JOIN "Order" o ON o.id = r."orderId"
      WHERE r.method = 'GCASH' AND r."paidOutById" IS NULL AND r."shiftHandoverId" IS NULL
        AND o.status <> 'CANCELLED'
        AND r."createdAt" > COALESCE((SELECT max("endTime") FROM "ShiftHandover"), '-infinity'::timestamp)
      FOR UPDATE OF r
    `;
    return rows.map((r) => r.id);
  }

  // GCash refunds each handover reconciled (handover id → total).
  async sumGcashByHandover(handoverIds: string[], tx: PrismaClientOrTx = prisma): Promise<Map<string, number>> {
    if (handoverIds.length === 0) return new Map();
    const rows = await tx.refund.groupBy({
      by: ["shiftHandoverId"],
      where: { method: PaymentMethod.GCASH, paidOutById: null, shiftHandoverId: { in: handoverIds } },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.shiftHandoverId as string, Number(r._sum.amount ?? 0)]));
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
