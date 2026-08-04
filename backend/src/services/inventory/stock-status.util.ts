import { prisma } from "../../lib/prisma.js";
import { Prisma, StockStatus } from "../../../generated/prisma/client.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";

const inventoryRepository = new InventoryRepository();

// stockStatus is derived, never client-supplied — otherwise it can drift
// out of sync with quantity/lowStockThreshold (e.g. a client setting
// IN_STOCK on an item that's actually at 0). Computed here so every write
// path (create/update/restock) stays consistent.
export function computeStockStatus(quantity: number, lowStockThreshold: number): StockStatus {
  if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
  if (quantity <= lowStockThreshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

// Re-fetch → compute → persist, as one call. Extracted because Orders'
// create and cancel flows both need to recompute stockStatus after
// changing quantity by an amount that isn't known until the write happens
// (unlike Inventory's own restock/update services, which already have the
// new quantity in hand from their own single write and don't need a
// separate re-fetch).
export async function refreshStockStatus(
  inventoryId: string,
  tx: typeof prisma | Prisma.TransactionClient = prisma
) {
  const updated = await inventoryRepository.findById(inventoryId, tx);
  if (!updated) return;
  const nextStatus = computeStockStatus(updated.quantity, updated.lowStockThreshold);
  await inventoryRepository.setStockStatus(inventoryId, nextStatus, tx);
}
