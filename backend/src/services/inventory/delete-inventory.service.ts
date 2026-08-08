import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();

export async function deleteInventoryService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await inventoryRepository.findById(id, tx);
      if (!existing || !existing.isActive) return null;

      // Soft delete only — see schema.prisma's isActive comment. Historical
      // OrderDetail/PackageDetail/InventoryConsumption rows keep their real
      // reference; the item just stops appearing in active listings.
      await inventoryRepository.softDelete(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.DELETE,
        module: "Inventory",
        description: `Removed inventory item "${existing.itemName}"`,
        oldValue: { itemName: existing.itemName, quantity: existing.quantity },
      });

      return true;
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
      message: "Inventory item removed successfully",
    };
  } catch (error) {
    console.error("deleteInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to remove inventory item",
    };
  }
}
