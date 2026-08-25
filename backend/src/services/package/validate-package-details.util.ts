import { InventoryRepository } from "../../repositories/inventory.repository.js";

const inventoryRepository = new InventoryRepository();

// Never trust client input: every inventoryId in a package's recipe must
// reference a real, active Inventory row, and the same ingredient can't be
// listed twice in one request. Returns an error message string, or null if
// the details array is valid.
//
// Single batched findMany instead of one findById per ingredient — a
// package with N ingredients previously issued N sequential round trips.
export async function validatePackageDetails(
  details: { inventoryId: string; quantity: number }[]
): Promise<string | null> {
  const seen = new Set<string>();
  for (const detail of details) {
    if (seen.has(detail.inventoryId)) {
      return `Duplicate inventory item in package details: ${detail.inventoryId}`;
    }
    seen.add(detail.inventoryId);
  }

  const items = await inventoryRepository.findByIds([...seen]);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  for (const inventoryId of seen) {
    const item = itemsById.get(inventoryId);
    if (!item || !item.isActive) {
      return `Inventory item not found or inactive: ${inventoryId}`;
    }
  }

  return null;
}
