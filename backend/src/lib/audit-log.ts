import { Prisma, AuditAction } from "../../generated/prisma/client.js";
import { AuditLogRepository } from "../repositories/audit-log.repository.js";

const auditLogRepository = new AuditLogRepository();

// The single entry point for creating an AuditLog record. Services never
// construct one directly — this keeps the shape consistent and gives
// Module 10 one place to change if the record's fields ever need to grow.
//
// Always takes a transaction client, never the bare prisma singleton: the
// business action and its audit entry must commit or roll back together,
// so every call site wraps its work in prisma.$transaction and passes that
// tx through here, even for services that only had a single write before
// Module 10.
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    action: AuditAction;
    module: string;
    description?: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
  }
): Promise<void> {
  await auditLogRepository.create(data, tx);
}
