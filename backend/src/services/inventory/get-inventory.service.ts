import { InventoryRepository } from "../../repositories/inventory.repository.js";

const inventoryRepository = new InventoryRepository();

export async function getInventoryService(id: string) {
  try {
    const item = await inventoryRepository.findById(id);

    if (!item) {
      return {
        code: 404,
        status: "error",
        message: "Inventory item not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Inventory item retrieved successfully",
      data: { item },
    };
  } catch (error) {
    console.error("getInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve inventory item",
    };
  }
}
