import { InventoryRepository } from "../../repositories/inventory.repository.js";

const inventoryRepository = new InventoryRepository();

export async function listInventoryService() {
  try {
    const items = await inventoryRepository.findAllActive();

    return {
      code: 200,
      status: "success",
      message: "Inventory items retrieved successfully",
      data: { items },
    };
  } catch (error) {
    console.error("listInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve inventory items",
    };
  }
}
