import { Prisma } from "../../generated/prisma/client.js";

// The single serialization point for the shared cash drawer. Every
// balance-affecting operation (Shift Handover creation, Withdrawal
// creation) MUST call this as the very first statement inside its
// transaction, before any other read — including reads that look
// harmless. Acquiring it late (e.g. after already reading the most recent
// Shift Handover) reopens the exact write-skew race this lock exists to
// close, since the vulnerable read would already have happened outside
// its protection.
//
// Centralized here deliberately, instead of inlined in each service, so a
// future balance-affecting operation can't be added without going through
// this exact call.
export async function acquireDrawerLock(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "DrawerState" WHERE id = 1 FOR UPDATE`;
}
