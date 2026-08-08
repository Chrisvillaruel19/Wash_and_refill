import { InventoryRepository } from "../../repositories/inventory.repository.js";

const inventoryRepository = new InventoryRepository();

// Filters in application code against the live quantity/lowStockThreshold
// values, rather than trusting the stored stockStatus enum alone — the
// same defense-in-depth the create/update/restock services rely on by
// always recomputing stockStatus on write, kept consistent here on read.
export async function lowStockInventoryService() {
  try {
    const items = await inventoryRepository.findAllActive();
    const lowStockItems = items.filter((item) => item.quantity <= item.lowStockThreshold);

    return {
      code: 200,
      status: "success",
      message: "Low stock items retrieved successfully",
      data: { items: lowStockItems },
    };
  } catch (error) {
    console.error("lowStockInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve low stock items",
    };
  }
}
