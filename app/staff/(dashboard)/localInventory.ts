import { InventoryItem, ActivityLog } from "./types";

const INVENTORY_KEY = "wrlms_inventory";
const ACTIVITY_KEY = "wrlms_activity";

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

export function getActivityLogs(): ActivityLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addActivityLog(log: ActivityLog) {
  const logs = getActivityLogs();
  const updated = [log, ...logs].slice(0, 20);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
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
      id: `${Date.now()}`,
      type: "restock",
      message: `Staff: ${staffName} has Restocked stock: ${addQty}x ${item.name}`,
      timestamp: new Date().toISOString(),
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
      id: `${Date.now()}`,
      type: "update",
      message: `Staff: ${staffName} has Updated stock: ${item.name} ${oldStock} → ${updates.currentStock}`,
      timestamp: new Date().toISOString(),
    });
  }

  return updated;
}