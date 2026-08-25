import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const detailInclude = { details: { include: { inventory: true } } } as const;

export class PackageRepository {
  async findAllActive(tx: PrismaClientOrTx = prisma) {
    return tx.package.findMany({
      where: { status: true },
      include: detailInclude,
      orderBy: { packageName: "asc" },
    });
  }

  // Not filtered by status — a soft-deleted package must still be readable
  // by id so historical OrderDetail rows can display what it was.
  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.package.findUnique({ where: { id }, include: detailInclude });
  }

  async create(
    data: { packageName: string; price: number; color?: string },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.package.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ packageName: string; price: number; color: string }>,
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.package.update({ where: { id }, data });
  }

  // Delete-then-recreate the whole recipe in one call — matches how the
  // frontend already treats every field as a whole-object replace, and
  // avoids the complexity of diffing individual ingredient rows.
  async replaceDetails(
    packageId: string,
    details: { inventoryId: string; quantity: number }[],
    tx: PrismaClientOrTx = prisma
  ) {
    await tx.packageDetail.deleteMany({ where: { packageId } });
    if (details.length === 0) return;
    await tx.packageDetail.createMany({
      data: details.map((d) => ({ packageId, inventoryId: d.inventoryId, quantity: d.quantity })),
    });
  }

  async softDelete(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.package.update({ where: { id }, data: { status: false } });
  }

  async restore(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.package.update({ where: { id }, data: { status: true } });
  }
}
