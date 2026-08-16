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

// Verifies the given Admin credentials belong to an ACTIVE Admin and, if
// so, returns a short-lived, single-use authorization scoped to this one
// item — never the Admin's password itself. That password lives only in
// this one request; it is never sent again, stored, or logged. The
// returned token is what actually authorizes the restockInventoryItem call
// below, and must be held only in memory (component state), never
// localStorage/sessionStorage.
export async function requestRestockAuthorization(
  id: string,
  adminUsername: string,
  adminPassword: string
): Promise<string> {
  const { authorizationToken } = await apiClient.post<{ authorizationToken: string; expiresIn: string }>(
    `/inventory/${id}/restock-authorization`,
    { adminUsername, adminPassword }
  );
  return authorizationToken;
}

export async function restockInventoryItem(
  id: string,
  quantity: number,
  authorizationToken: string
): Promise<InventoryItem> {
  const { item } = await apiClient.post<{ item: BackendInventoryItem }>(`/inventory/${id}/restock`, {
    quantity,
    authorizationToken,
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
