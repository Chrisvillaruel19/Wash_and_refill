import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class CustomerRepository {
  async findAll(tx: PrismaClientOrTx = prisma) {
    return tx.customer.findMany({ orderBy: { customerName: "asc" } });
  }

  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.customer.findUnique({ where: { id } });
  }

  async findByPhone(phoneNumber: string, tx: PrismaClientOrTx = prisma) {
    return tx.customer.findUnique({ where: { phoneNumber } });
  }

  async create(
    data: { customerName: string; phoneNumber: string },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.customer.create({ data });
  }

  // For use INSIDE a larger multi-step transaction (e.g. Order creation),
  // where the create-then-catch-P2002 pattern used by the standalone
  // Customer find-or-create endpoint is unsafe: Postgres aborts the entire
  // transaction after any error, including a unique-constraint violation,
  // so a caught error can't be followed by another query on the same
  // transaction client. upsert performs the whole find-or-create as one
  // atomic query with no error path to catch around.
  async findOrCreateByPhone(
    data: { customerName: string; phoneNumber: string },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.customer.upsert({
      where: { phoneNumber: data.phoneNumber },
      update: {},
      create: data,
    });
  }

  async updateName(id: string, customerName: string, tx: PrismaClientOrTx = prisma) {
    return tx.customer.update({ where: { id }, data: { customerName } });
  }

  async delete(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.customer.delete({ where: { id } });
  }
}
