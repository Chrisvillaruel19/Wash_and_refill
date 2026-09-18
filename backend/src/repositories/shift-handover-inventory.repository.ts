import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class ShiftHandoverInventoryRepository {
  async createMany(
    shiftHandoverId: string,
    rows: { inventoryId: string; itemName: string; unit: string; beginningQty: number; endingQty: number }[],
    tx: PrismaClientOrTx = prisma
  ) {
    if (rows.length === 0) return;
    await tx.shiftHandoverInventory.createMany({
      data: rows.map((r) => ({ ...r, shiftHandoverId })),
    });
  }

  async findByShiftHandoverId(shiftHandoverId: string, tx: PrismaClientOrTx = prisma) {
    return tx.shiftHandoverInventory.findMany({
      where: { shiftHandoverId },
      orderBy: { itemName: "asc" },
    });
  }

  // Batched "current beginning quantity" lookup for every active inventory
  // item at once, instead of one query per item. For each inventoryId, the
  // beginning is that item's endingQty from its own most recent snapshot
  // row — found via a DISTINCT ON ordered by the parent handover's endTime
  // desc, global across all staff (one shared stockroom, same "previous
  // ending becomes next beginning" precedent as getDrawerStart()). Items
  // with no prior snapshot simply have no entry in the returned map — the
  // caller falls back to that item's live quantity (see
  // create-shift-handover.service.ts).
  async findLatestEndingQtyByInventoryIds(
    inventoryIds: string[],
    tx: PrismaClientOrTx = prisma
  ): Promise<Map<string, number>> {
    if (inventoryIds.length === 0) return new Map();

    const rows = await tx.$queryRaw<{ inventoryId: string; endingQty: number }[]>`
      SELECT DISTINCT ON (shi."inventoryId") shi."inventoryId", shi."endingQty"
      FROM "ShiftHandoverInventory" shi
      INNER JOIN "ShiftHandover" sh ON sh.id = shi."shiftHandoverId"
      WHERE shi."inventoryId" IN (${Prisma.join(inventoryIds)})
      ORDER BY shi."inventoryId", sh."endTime" DESC
    `;

    return new Map(rows.map((r) => [r.inventoryId, r.endingQty]));
  }
}
