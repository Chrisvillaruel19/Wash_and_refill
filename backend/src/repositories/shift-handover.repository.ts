import { prisma } from "../lib/prisma.js";
import { Prisma, CashStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class ShiftHandoverRepository {
  // Shared visibility (approved): every authenticated user sees every
  // record — one physical drawer, not per-user data. Paginated, newest
  // first — matches AuditLogRepository.findAll's shape.
  async findAll(params: { page: number; pageSize: number }, tx: PrismaClientOrTx = prisma) {
    return tx.shiftHandover.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { endTime: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  }

  async count(tx: PrismaClientOrTx = prisma) {
    return tx.shiftHandover.count();
  }

  // The single most recent handover across ALL staff — the shared drawer's
  // last known state, used as the starting balance for the next handover
  // and for Withdrawal's live balance calculation.
  async findMostRecent(tx: PrismaClientOrTx = prisma) {
    return tx.shiftHandover.findFirst({ orderBy: { endTime: "desc" } });
  }

  async create(
    data: {
      userId: string;
      startTime: Date;
      endTime: Date;
      laundryEarnings: number;
      supplySales: number;
      customServiceSales: number;
      digitalSales: number;
      expense: number;
      withdrawal: number;
      expectedBalance: number;
      actualCashCount: number;
      cashStatus: CashStatus;
      notes?: string;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.shiftHandover.create({ data });
  }
}
