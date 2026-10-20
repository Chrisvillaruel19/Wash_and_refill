import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { getBeginningQuantities } from "./inventory-beginning.util.js";

const inventoryRepository = new InventoryRepository();
const shiftHandoverRepository = new ShiftHandoverRepository();

// The open shift's beginning count per active supply item — the same rule
// the handover snapshot uses on submit, so Staff's "Beginning → Now"
// preview matches what gets recorded.
export async function getInventoryBeginningService() {
  try {
    const [items, latest] = await Promise.all([
      inventoryRepository.findAllActive(),
      shiftHandoverRepository.findLatestForEarnings(),
    ]);
    const beginning = await getBeginningQuantities(items, latest?.endTime ?? null);
    return {
      code: 200,
      status: "success",
      message: "Beginning inventory retrieved successfully",
      data: { items: items.map((i) => ({ inventoryId: i.id, beginningQty: beginning.get(i.id) ?? i.quantity })) },
    };
  } catch (error) {
    console.error("getInventoryBeginningService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve beginning inventory" };
  }
}
