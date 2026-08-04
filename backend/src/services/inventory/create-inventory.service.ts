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
    const created = await prisma.$transaction(async (tx) => {
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

      return item;
    });

    return {
      code: 201,
      status: "success",
      message: "Inventory item created successfully",
      data: { item: created },
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
