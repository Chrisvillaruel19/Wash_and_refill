import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction, Prisma } from "../../../generated/prisma/client.js";

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

      // Duplicate guard only when identity (name OR unit) is actually
      // changing — saving an item with its own current name+unit isn't a
      // duplicate (excludeId handles the rename case; the identity-unchanged
      // early-skip keeps a pure price/stock edit from even querying). Same
      // (name + unit) rule as create — see inventory.repository.ts's
      // findActiveByNameAndUnit for why unit is compared case-insensitively.
      const identityChanging =
        (updates.itemName !== undefined && updates.itemName !== existing.itemName) ||
        (updates.unit !== undefined && updates.unit.toLowerCase() !== existing.unit.toLowerCase());
      if (identityChanging) {
        const nextName = updates.itemName ?? existing.itemName;
        const nextUnit = updates.unit ?? existing.unit;
        const duplicate = await inventoryRepository.findActiveByNameAndUnit(
          nextName,
          nextUnit,
          { excludeId: id },
          tx
        );
        if (duplicate) return { duplicate: true as const };
      }

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

    if ("duplicate" in result) {
      return {
        code: 409,
        status: "error",
        message: "An active inventory item with this name and unit already exists",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Inventory item updated successfully",
      data: { item: result },
    };
  } catch (error) {
    // Same concurrency backstop as create — the UPDATE can race a concurrent
    // create/rename past the find-then-check guard, and the partial unique
    // index rejects it as P2002. Surfaced as the same user-facing 409.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        code: 409,
        status: "error",
        message: "An active inventory item with this name and unit already exists",
      };
    }
    console.error("updateInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update inventory item",
    };
  }
}
