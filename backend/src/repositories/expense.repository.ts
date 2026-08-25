import { prisma } from "../lib/prisma.js";
import { Prisma, ExpenseCategory } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class ExpenseRepository {
  async create(
    data: {
      userId: string;
      amount: number;
      category: ExpenseCategory;
      description: string;
      receiptUrl?: string;
      expenseDate: Date;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.expense.create({ data });
  }

  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.expense.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<{
      amount: number;
      category: ExpenseCategory;
      description: string;
      receiptUrl: string;
    }>,
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.expense.update({ where: { id }, data });
  }

  // Admin scope — every expense, across all staff. Paginated, newest first —
  // matches AuditLogRepository.findAll's shape.
  async findAll(params: { page: number; pageSize: number }, tx: PrismaClientOrTx = prisma) {
    return tx.expense.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  }

  async count(tx: PrismaClientOrTx = prisma) {
    return tx.expense.count();
  }

  // Staff scope — only the authenticated user's own submissions. Still
  // joins User (not just the already-known userId) so the service layer can
  // derive `submittedBy` the same way for both scopes.
  async findAllForUser(
    userId: string,
    params: { page: number; pageSize: number },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.expense.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  }

  async countForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.expense.count({ where: { userId } });
  }

  // Claim-based reconciliation source (global): every currently-unclaimed
  // expense, regardless of who submitted it. Plain read, no FOR UPDATE —
  // only used for Withdrawal's live balance check or after the caller has
  // already locked the rows it intends to claim via lockUnclaimedIds.
  async findUnclaimed(tx: PrismaClientOrTx = prisma) {
    return tx.expense.findMany({ where: { shiftHandoverId: null } });
  }

  // The actual claim step for Shift Handover creation — see
  // OrderRepository.lockUnclaimedPaidIds for the full rationale.
  async lockUnclaimedIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Expense" WHERE "shiftHandoverId" IS NULL FOR UPDATE
    `;
    return rows.map((r) => r.id);
  }

  async claim(ids: string[], shiftHandoverId: string, tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return;
    await tx.expense.updateMany({ where: { id: { in: ids } }, data: { shiftHandoverId } });
  }

  async findByIds(ids: string[], tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return [];
    return tx.expense.findMany({ where: { id: { in: ids } } });
  }

  // Unreported-activity check for Attendance's clock-out gate: this
  // staff's own expenses still unclaimed by any handover. Claim-status
  // based, not timestamp based.
  async findUnclaimedForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.expense.findMany({ where: { userId, shiftHandoverId: null } });
  }

  // Analytics source: every expense whose expenseDate falls in [start, end)
  // — global (all staff), joined with the submitting user for per-staff
  // breakdowns. Independent of shiftHandoverId/claim status, same reasoning
  // as OrderRepository.findPaidInRange — an expense counts for the period
  // it happened in regardless of whether it's been reconciled yet.
  async findInRange(start: Date, end: Date, tx: PrismaClientOrTx = prisma) {
    return tx.expense.findMany({
      where: { expenseDate: { gte: start, lt: end } },
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
