import { apiClient } from "../apiClient";
import { InventoryItem } from "../../staff/(dashboard)/types";

type BackendInventoryItem = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: string;
  lowStockThreshold: number;
};

function mapItem(item: BackendInventoryItem): InventoryItem {
  return {
    id: item.id,
    name: item.itemName,
    currentStock: item.quantity,
    lowStockAlert: item.lowStockThreshold,
    unit: item.unit,
    price: Number(item.unitPrice),
  };
}

export async function getInventory(): Promise<InventoryItem[]> {
  const { items } = await apiClient.get<{ items: BackendInventoryItem[] }>("/inventory");
  return items.map(mapItem);
}

// Admin-only — called from the Admin's own authenticated session, with no
// credentials in the request (requireRole(ADMIN) on the backend route is
// the proof). Returns a short-lived, single-use, item-scoped 6-digit code
// the Admin then reads aloud/hands to a Staff member in person. Never the
// Admin's password — this call doesn't touch it at all.
export async function requestRestockAuthorizationCode(
  id: string
): Promise<{ code: string; expiresIn: string }> {
  const { authorizationCode, expiresIn } = await apiClient.post<{
    authorizationCode: string;
    expiresIn: string;
  }>(`/inventory/${id}/restock-authorization`, {});
  return { code: authorizationCode, expiresIn };
}

export async function restockInventoryItem(
  id: string,
  quantity: number,
  authorizationCode: string
): Promise<InventoryItem> {
  const { item } = await apiClient.post<{ item: BackendInventoryItem }>(`/inventory/${id}/restock`, {
    quantity,
    authorizationCode,
  });
  return mapItem(item);
}

export async function createInventoryItem(data: {
  name: string;
  currentStock: number;
  lowStockAlert: number;
  unit: string;
  price: number;
}): Promise<InventoryItem> {
  const { item } = await apiClient.post<{ item: BackendInventoryItem }>("/inventory", {
    itemName: data.name,
    quantity: data.currentStock,
    unit: data.unit,
    unitPrice: data.price,
    lowStockThreshold: data.lowStockAlert,
  });
  return mapItem(item);
}

export async function updateInventoryItem(
  id: string,
  data: { name: string; currentStock: number; lowStockAlert: number; unit: string; price: number }
): Promise<InventoryItem> {
  const { item } = await apiClient.patch<{ item: BackendInventoryItem }>(`/inventory/${id}`, {
    itemName: data.name,
    quantity: data.currentStock,
    unit: data.unit,
    unitPrice: data.price,
    lowStockThreshold: data.lowStockAlert,
  });
  return mapItem(item);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient.delete(`/inventory/${id}`);
}
