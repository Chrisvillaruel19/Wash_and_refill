import { prisma } from "../lib/prisma.js";
import { Prisma, StockStatus } from "../../generated/prisma/client.js";

// Accepts either the singleton client or a transaction client, so future
// modules (e.g. Orders) can call these methods inside their own
// prisma.$transaction(...) block instead of as a separate, non-atomic write.
type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class InventoryRepository {
  async findAllActive(tx: PrismaClientOrTx = prisma) {
    return tx.inventory.findMany({
      where: { isActive: true },
      orderBy: { itemName: "asc" },
    });
  }

  // Not filtered by isActive — a soft-deleted item must still be readable
  // by id so historical order/package details can display what it was.
  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.inventory.findUnique({ where: { id } });
  }

  async create(
    data: {
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      lowStockThreshold: number;
      stockStatus: StockStatus;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.inventory.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      lowStockThreshold: number;
      stockStatus: StockStatus;
    }>,
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.inventory.update({ where: { id }, data });
  }

  // Atomic increment — avoids a read-then-write race between two concurrent
  // restocks of the same item, which a plain "read quantity, add, save"
  // approach (the frontend's current pattern) would be vulnerable to.
  async incrementQuantity(id: string, addQty: number, tx: PrismaClientOrTx = prisma) {
    return tx.inventory.update({
      where: { id },
      data: { quantity: { increment: addQty } },
    });
  }

  async setStockStatus(id: string, stockStatus: StockStatus, tx: PrismaClientOrTx = prisma) {
    return tx.inventory.update({ where: { id }, data: { stockStatus } });
  }

  // Atomic conditional decrement for Orders: the WHERE clause's quantity
  // check and the decrement happen as one database operation, not a
  // separate read-then-write — so two concurrent orders consuming the last
  // few units of the same item can never both succeed and drive stock
  // negative. updateMany's returned count is the only reliable signal here:
  // 1 means it succeeded, 0 means there wasn't enough stock (or the row
  // vanished) and the caller should treat this as an insufficient-stock
  // failure, not silently proceed.
  async decrementIfSufficient(id: string, amount: number, tx: PrismaClientOrTx = prisma) {
    return tx.inventory.updateMany({
      where: { id, quantity: { gte: amount } },
      data: { quantity: { decrement: amount } },
    });
  }

  async softDelete(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.inventory.update({ where: { id }, data: { isActive: false } });
  }
}
