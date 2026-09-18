import { prisma } from "../lib/prisma.js";
import { Prisma, CashStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class ShiftHandoverRepository {
  // Shared visibility (approved): every authenticated user sees every
  // record — one physical drawer, not per-user data. Paginated, newest
  // first — matches AuditLogRepository.findAll's shape.
  async findAll(params: { page: number; pageSize: number }, tx: PrismaClientOrTx = prisma) {
    return tx.shiftHandover.findMany({
      include: {
        user: { select: { id: true, name: true } },
        // Small, bounded per-handover list (one row per active inventory
        // item at the time of that shift) — eager-loading it here avoids a
        // second round-trip per card on the Admin/Staff history views.
        inventorySnapshot: { orderBy: { itemName: "asc" } },
      },
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

  // Logout/Clock-Out's "did this staff member formally hand over the
  // current shift" gate — separate from, and checked before, the existing
  // financial-reconciliation gate (getUnreportedActivity). Scoped to this
  // user's own handovers submitted at or after their current shift's
  // clock-in; a handover from a previous shift (or another staff member's)
  // never satisfies this. A plain existence check, not a full fetch.
  async existsForUserSince(userId: string, since: Date, tx: PrismaClientOrTx = prisma): Promise<boolean> {
    const found = await tx.shiftHandover.findFirst({
      where: { userId, endTime: { gte: since } },
      select: { id: true },
    });
    return found !== null;
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
