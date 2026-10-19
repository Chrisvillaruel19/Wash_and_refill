import { prisma } from "../lib/prisma.js";
import { Prisma, WithdrawalSource } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Only CASH withdrawals touch the drawer. A GCash withdrawal is money moved
// out of the shop's GCash account, so it's never part of any shift's drawer
// math (it stays unclaimed by any handover).
const drawerWithdrawal = { shiftHandoverId: null, source: WithdrawalSource.CASH };

export class WithdrawalRepository {
  async findAll(tx: PrismaClientOrTx = prisma) {
    return tx.withdrawal.findMany({
      include: {
        user: { select: { id: true, name: true } },
        earningsFromHandover: { select: { endTime: true, user: { select: { name: true } } } },
      },
      orderBy: { withdrawalDate: "desc" },
    });
  }

  // Cash taken out of the open drawer since the last handover (Admin
  // withdrawals, and claimed-order refunds paid from the drawer).
  async findUnclaimed(tx: PrismaClientOrTx = prisma) {
    return tx.withdrawal.findMany({ where: drawerWithdrawal, orderBy: { withdrawalDate: "asc" } });
  }

  async lockUnclaimedIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Withdrawal" WHERE "shiftHandoverId" IS NULL AND source = 'CASH' FOR UPDATE
    `;
    return rows.map((r) => r.id);
  }

  async claim(ids: string[], shiftHandoverId: string, tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return;
    await tx.withdrawal.updateMany({ where: { id: { in: ids } }, data: { shiftHandoverId } });
  }

  async findByIds(ids: string[], tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return [];
    return tx.withdrawal.findMany({ where: { id: { in: ids } } });
  }

  // Total already withdrawn from each closed shift's earnings, per source.
  async sumEarningsWithdrawn(handoverIds: string[], tx: PrismaClientOrTx = prisma) {
    if (handoverIds.length === 0) return [];
    return tx.withdrawal.groupBy({
      by: ["earningsFromHandoverId", "source"],
      where: { earningsFromHandoverId: { in: handoverIds } },
      _sum: { amount: true },
    });
  }

  // Every GCash withdrawal ever: earnings the Admin took vs claimed-order
  // refunds paid from the shop's GCash.
  async sumGcash(tx: PrismaClientOrTx = prisma): Promise<{ earnings: number; refunds: number }> {
    const [earnings, refunds] = await Promise.all([
      tx.withdrawal.aggregate({ where: { source: WithdrawalSource.GCASH, refundId: null }, _sum: { amount: true } }),
      tx.withdrawal.aggregate({
        where: { source: WithdrawalSource.GCASH, refundId: { not: null } },
        _sum: { amount: true },
      }),
    ]);
    return { earnings: Number(earnings._sum.amount ?? 0), refunds: Number(refunds._sum.amount ?? 0) };
  }

  // Earnings the Admin took within a period, per source — refund payouts
  // excluded (they're counted as refunds, not withdrawals).
  async sumEarningsInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    const rows = await tx.withdrawal.groupBy({
      by: ["source"],
      where: { refundId: null, withdrawalDate: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    });
    const of = (s: WithdrawalSource) => Number(rows.find((r) => r.source === s)?._sum.amount ?? 0);
    return { cash: of(WithdrawalSource.CASH), gcash: of(WithdrawalSource.GCASH) };
  }

  async create(
    data: {
      userId: string;
      amount: number;
      reason: string;
      remainingCash: number;
      withdrawalDate: Date;
      source?: WithdrawalSource;
      // Both set together for a closed shift's earnings — see schema.prisma.
      earningsFromHandoverId?: string;
      shiftHandoverId?: string;
      // Set when the money paid a claimed order's refund.
      refundId?: string;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.withdrawal.create({ data });
  }
}
