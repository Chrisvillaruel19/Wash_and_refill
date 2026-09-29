import { prisma } from "../lib/prisma.js";
import { Prisma, WithdrawalSource } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

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

  async findUnclaimed(tx: PrismaClientOrTx = prisma) {
    return tx.withdrawal.findMany({ where: { shiftHandoverId: null } });
  }

  async lockUnclaimedIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Withdrawal" WHERE "shiftHandoverId" IS NULL FOR UPDATE
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
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.withdrawal.create({ data });
  }
}
