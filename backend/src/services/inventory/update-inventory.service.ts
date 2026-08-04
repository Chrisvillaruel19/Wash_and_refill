import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();

export async function updateInventoryService(
  userId: string,
  id: string,
  updates: Partial<{
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lowStockThreshold: number;
  }>
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await inventoryRepository.findById(id, tx);
      if (!existing || !existing.isActive) return null;

      // Recompute stockStatus whenever quantity or the threshold changes,
      // using whichever value is being updated or falling back to the
      // existing one — never left stale relative to the new field values.
      const nextQuantity = updates.quantity ?? existing.quantity;
      const nextThreshold = updates.lowStockThreshold ?? existing.lowStockThreshold;
      const stockStatus = computeStockStatus(nextQuantity, nextThreshold);

      const updated = await inventoryRepository.update(id, { ...updates, stockStatus }, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "Inventory",
        description: `Updated inventory item "${updated.itemName}"`,
        oldValue: {
          itemName: existing.itemName,
          quantity: existing.quantity,
          unit: existing.unit,
          unitPrice: Number(existing.unitPrice),
          lowStockThreshold: existing.lowStockThreshold,
        },
        newValue: {
          itemName: updated.itemName,
          quantity: updated.quantity,
          unit: updated.unit,
          unitPrice: Number(updated.unitPrice),
          lowStockThreshold: updated.lowStockThreshold,
        },
      });

      return updated;
    });

    if (!result) {
      return {
        code: 404,
        status: "error",
        message: "Inventory item not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Inventory item updated successfully",
      data: { item: result },
    };
  } catch (error) {
    console.error("updateInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update inventory item",
    };
  }
}
