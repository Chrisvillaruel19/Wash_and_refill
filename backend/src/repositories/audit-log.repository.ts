import { prisma } from "../lib/prisma.js";
import { Prisma, AuditAction } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class AuditLogRepository {
  // Only ever called through lib/audit-log.ts's writeAuditLog — services
  // never construct an AuditLog record directly.
  async create(
    data: {
      userId: string;
      action: AuditAction;
      module: string;
      description?: string;
      oldValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.auditLog.create({ data });
  }

  // Module 9's Recent Activity widget. excludeModules lets non-Admin callers
  // be kept out of the modules that carry genuinely sensitive data (Employee
  // PII, Withdrawal cash figures) — everything else stays visible, since
  // Staff can already see that data through its own read endpoints anyway.
  async findRecent(limit: number, excludeModules: string[] = [], tx: PrismaClientOrTx = prisma) {
    return tx.auditLog.findMany({
      where: excludeModules.length > 0 ? { module: { notIn: excludeModules } } : undefined,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // Module 10's own browsable listing — paginated, filterable, newest first.
  async findAll(
    params: { action?: AuditAction; module?: string; page: number; pageSize: number },
    tx: PrismaClientOrTx = prisma
  ) {
    const where = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.module ? { module: params.module } : {}),
    };
    return tx.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  }

  async count(params: { action?: AuditAction; module?: string }, tx: PrismaClientOrTx = prisma) {
    const where = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.module ? { module: params.module } : {}),
    };
    return tx.auditLog.count({ where });
  }
}
