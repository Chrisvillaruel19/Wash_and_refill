import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();

export async function createInventoryService(
  userId: string,
  data: {
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lowStockThreshold: number;
  }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await inventoryRepository.findActiveByName(data.itemName, tx);
      if (duplicate) return { duplicate: true as const };

      const stockStatus = computeStockStatus(data.quantity, data.lowStockThreshold);
      const item = await inventoryRepository.create({ ...data, stockStatus }, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "Inventory",
        description: `Created inventory item "${item.itemName}"`,
        newValue: {
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          lowStockThreshold: item.lowStockThreshold,
        },
      });

      return { item };
    });

    if ("duplicate" in result) {
      return {
        code: 409,
        status: "error",
        message: "An active inventory item with this name already exists",
      };
    }

    return {
      code: 201,
      status: "success",
      message: "Inventory item created successfully",
      data: { item: result.item },
    };
  } catch (error) {
    console.error("createInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create inventory item",
    };
  }
}
