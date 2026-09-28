import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction, Prisma } from "../../../generated/prisma/client.js";

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
      // Duplicate guard matches on (name + unit), not name alone — "Liquid
      // Detergent" in Sachets and in Bottles are different products. The
      // find-then-create check below can still race a concurrent create
      // past itself, so the partial unique index (see migration ..._inventory_name_unit_active)
      // is the real backstop: it turns a would-be double-insert into P2002,
      // caught outside the transaction and surfaced as the same 409.
      const duplicate = await inventoryRepository.findActiveByNameAndUnit(data.itemName, data.unit, {}, tx);
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
        message: "An active inventory item with this name and unit already exists",
      };
    }

    return {
      code: 201,
      status: "success",
      message: "Inventory item created successfully",
      data: { item: result.item },
    };
  } catch (error) {
    // Two concurrent creates passing the find-then-create guard above both
    // reach the INSERT; the partial unique index (name + lower(unit) where
    // isActive) rejects the second one as P2002 — surfaced here as the same
    // user-facing duplicate error rather than a raw 500.
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
    console.error("createInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create inventory item",
    };
  }
}
