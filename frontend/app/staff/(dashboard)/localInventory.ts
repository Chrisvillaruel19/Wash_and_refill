import { InventoryItem } from "./types";
import { addActivityLog } from "./localActivity";
import { getStoredPackages } from "../../lib/localPackages";

const INVENTORY_KEY = "wrlms_inventory";

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Fabcon", currentStock: 15, lowStockAlert: 30, unit: "Liters", price: 30 },
  { id: "2", name: "Liquid Detergent", currentStock: 46, lowStockAlert: 30, unit: "Sachet", price: 30 },
  { id: "3", name: "Bleach", currentStock: 50, lowStockAlert: 40, unit: "Liters", price: 20 },
  { id: "4", name: "Downy", currentStock: 20, lowStockAlert: 35, unit: "Liters", price: 40 },
  { id: "5", name: "Liquid Detergent", currentStock: 60, lowStockAlert: 40, unit: "Liters", price: 35 },
  { id: "6", name: "Plastic", currentStock: 60, lowStockAlert: 40, unit: "Liters", price: 5 },
];

export function getStoredInventory(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (!raw) {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(DEFAULT_INVENTORY));
      return DEFAULT_INVENTORY;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_INVENTORY;
  }
}

function saveInventory(items: InventoryItem[]) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

export function getLowStockItems(): InventoryItem[] {
  return getStoredInventory().filter((item) => item.currentStock <= item.lowStockAlert);
}

export function restockItem(id: string, addQty: number, staffName: string): InventoryItem[] {
  const items = getStoredInventory();
  const item = items.find((i) => i.id === id);

  const updated = items.map((i) =>
    i.id === id ? { ...i, currentStock: i.currentStock + addQty } : i
  );
  saveInventory(updated);

  if (item) {
    addActivityLog({
      type: "restock",
      message: `Staff: ${staffName} has Restocked stock: ${addQty}x ${item.name}`,
    });
  }

  return updated;
}

export function updateItem(
  id: string,
  updates: Partial<InventoryItem>,
  staffName: string
): InventoryItem[] {
  const items = getStoredInventory();
  const item = items.find((i) => i.id === id);
  const oldStock = item?.currentStock;

  const updated = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
  saveInventory(updated);

  if (item && updates.currentStock !== undefined && updates.currentStock !== oldStock) {
    addActivityLog({
      type: "update",
      message: `Staff: ${staffName} has Updated stock: ${item.name} ${oldStock} → ${updates.currentStock}`,
    });
  }

  return updated;
}

export function addInventoryItem(item: Omit<InventoryItem, "id">): InventoryItem[] {
  const items = getStoredInventory();

  const newItem: InventoryItem = {
    ...item,
    id: `${Date.now()}`,
  };

  const updated = [newItem, ...items];
  saveInventory(updated);

  addActivityLog({
    type: "add",
    message: `Admin added a new catalog item: ${newItem.name}`,
  });

  return updated;
}

// Scoped deliberately to ONLY the package-deduction dependency: these two
// rows are matched directly by name (Downy) or name+unit (Sachet Liquid
// Detergent) in applyOrderStockImpact's package loop below. Renaming or
// deleting either one silently breaks every package sale's stock deduction.
// Deliberately does NOT cover Fabcon/Bleach/Plastic/Liters-Liquid-Detergent —
// those depend on a separate mechanism (the supply-deduction loop's static
// catalog match), a distinct, larger architectural issue tracked separately
// and not conflated with this warning. Exported purely to power an
// editor-facing warning — it doesn't change any matching behavior.
export function isCriticalInventoryItem(item: Pick<InventoryItem, "name" | "unit">): boolean {
  if (item.name === "Downy") return true;
  if (item.name === "Liquid Detergent" && item.unit === "Sachet") return true;
  return false;
}

// Order items are stored as either a plain name ("Basic") or, when several
// of the same item were added to one order, with a quantity suffix
// ("Basic ×5"). Mirrors the identical helper already used by Shift Handover
// and Admin Sales (see project_wrlms_known_issues on that duplication).
function getItemQuantity(itemStr: string, name: string): number {
  if (itemStr === name) return 1;
  const prefix = `${name} ×`;
  if (itemStr.startsWith(prefix)) {
    const num = parseInt(itemStr.slice(prefix.length), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// Applies (direction=1) or reverses (direction=-1) one order's raw-material
// stock impact. Used both when an order is created (deduct) and when an
// order is cancelled (restore) — same math, opposite sign, so the two paths
// can never drift out of sync with each other.
export function applyOrderStockImpact(items: string[], direction: 1 | -1): InventoryItem[] {
  const inventory = getStoredInventory();
  const packages = getStoredPackages();

  // Two inventory items happen to share the name "Liquid Detergent" — one
  // tracked in Sachets, one in Liters (a known duplicate-name data-model
  // gap, see project_wrlms_known_issues). Packages' liquidDetergent counts
  // (1-4) only make sense as sachets-per-load, so packages consume the
  // Sachet-tracked item specifically, never the Liters one.
  const detergentSachetItem = inventory.find(
    (i) => i.name === "Liquid Detergent" && i.unit === "Sachet"
  );
  const downyItem = inventory.find((i) => i.name === "Downy");

  const deltas = new Map<string, number>();
  function addDelta(id: string | undefined, qty: number) {
    if (!id || qty === 0) return;
    deltas.set(id, (deltas.get(id) || 0) + qty * direction);
  }

  for (const pkg of packages) {
    const qty = items.reduce((sum, itemStr) => sum + getItemQuantity(itemStr, pkg.name), 0);
    if (qty === 0) continue;
    addDelta(detergentSachetItem?.id, pkg.liquidDetergent * qty);
    addDelta(downyItem?.id, pkg.downy * qty);
  }

  // Raw supplies sold directly (not part of a package) map 1:1 to whatever
  // is currently in inventory (demo-mode fix: this used to match against a
  // hardcoded list, which is why newly-added items were never deducted).
  // Same "(Unit)" disambiguation as the checkout menu (neworder/page.tsx)
  // for the two rows sharing the name "Liquid Detergent".
  const nameCounts = new Map<string, number>();
  inventory.forEach((i) => nameCounts.set(i.name, (nameCounts.get(i.name) || 0) + 1));
  for (const invItem of inventory) {
    const displayName =
      (nameCounts.get(invItem.name) || 0) > 1 ? `${invItem.name} (${invItem.unit})` : invItem.name;
    const qty = items.reduce((sum, itemStr) => sum + getItemQuantity(itemStr, displayName), 0);
    addDelta(invItem.id, qty);
  }

  if (deltas.size === 0) return inventory;

  const updated = inventory.map((i) =>
    deltas.has(i.id) ? { ...i, currentStock: i.currentStock - (deltas.get(i.id) as number) } : i
  );
  saveInventory(updated);
  return updated;
}

export function deleteInventoryItem(id: string): InventoryItem[] {
  const items = getStoredInventory();
  const target = items.find((i) => i.id === id);

  const updated = items.filter((i) => i.id !== id);
  saveInventory(updated);

  if (target) {
    addActivityLog({
      type: "delete",
      message: `Admin removed catalog item: ${target.name}`,
    });
  }

  return updated;
}