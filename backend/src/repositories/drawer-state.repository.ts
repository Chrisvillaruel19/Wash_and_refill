import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class DrawerStateRepository {
  // The singleton row (id=1, seeded by migration) is never created by
  // application code — every caller trusts it already exists, same
  // assumption acquireDrawerLock already makes.
  async get(tx: PrismaClientOrTx = prisma) {
    return tx.drawerState.findUniqueOrThrow({ where: { id: 1 } });
  }

  async updateDefaultStartingCash(defaultStartingCash: number, tx: PrismaClientOrTx = prisma) {
    return tx.drawerState.update({ where: { id: 1 }, data: { defaultStartingCash } });
  }
}
