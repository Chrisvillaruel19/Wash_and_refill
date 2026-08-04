import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class WithdrawalRepository {
  // Admin-only visibility — no Staff-side consumer of Withdrawal exists in
  // the frontend at all, unlike ShiftHandover/Expense.
  async findAll(tx: PrismaClientOrTx = prisma) {
    return tx.withdrawal.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { withdrawalDate: "desc" },
    });
  }

  // Claim-based reconciliation source (global — Withdrawal has no
  // per-staff attribution, any Admin can withdraw from the one shared
  // drawer): every currently-unclaimed withdrawal. Plain read, no FOR
  // UPDATE — only used for Withdrawal's own live balance check or after
  // the caller has already locked the rows it intends to claim.
  async findUnclaimed(tx: PrismaClientOrTx = prisma) {
    return tx.withdrawal.findMany({ where: { shiftHandoverId: null } });
  }

  // The actual claim step for Shift Handover creation — see
  // OrderRepository.lockUnclaimedPaidIds for the full rationale.
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

  async create(
    data: { userId: string; amount: number; reason: string; remainingCash: number; withdrawalDate: Date },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.withdrawal.create({ data });
  }
}
