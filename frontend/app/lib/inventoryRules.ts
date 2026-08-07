import { InventoryItem } from "../staff/(dashboard)/types";

// Scoped deliberately to ONLY the package-deduction dependency: these two
// rows are matched directly by name (Downy) or name+unit (Sachet Liquid
// Detergent) by the backend's package-consumption logic (order creation
// deducts package ingredients by exactly this name/unit match). Renaming or
// deleting either one silently breaks every package sale's stock deduction.
// Exported purely to power an editor-facing warning in Admin Catalog — it
// doesn't change any matching behavior itself.
export function isCriticalInventoryItem(item: Pick<InventoryItem, "name" | "unit">): boolean {
  if (item.name === "Downy") return true;
  if (item.name === "Liquid Detergent" && item.unit === "Sachet") return true;
  return false;
}
