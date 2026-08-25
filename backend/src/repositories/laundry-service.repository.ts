import { prisma } from "../lib/prisma.js";
import { Prisma, ItemType } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class LaundryServiceRepository {
  async findAllActive(tx: PrismaClientOrTx = prisma) {
    return tx.laundryService.findMany({
      where: { status: true },
      orderBy: { serviceName: "asc" },
    });
  }

  // Not filtered by status — a soft-deleted service must still be readable
  // by id so historical OrderDetail rows can display what it was.
  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.laundryService.findUnique({ where: { id } });
  }

  async create(
    data: { serviceName: string; itemType: ItemType; price: number },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.laundryService.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ serviceName: string; itemType: ItemType; price: number }>,
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.laundryService.update({ where: { id }, data });
  }

  async softDelete(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.laundryService.update({ where: { id }, data: { status: false } });
  }

  async restore(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.laundryService.update({ where: { id }, data: { status: true } });
  }
}
