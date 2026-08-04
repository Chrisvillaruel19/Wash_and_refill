import { apiClient } from "../apiClient";
import { Package } from "../../staff/(dashboard)/neworder/types";
import { getInventory } from "./inventoryApi.service";

type BackendPackageDetail = {
  quantity: number;
  inventory: { id: string; itemName: string; unit: string };
};

type BackendPackage = {
  id: string;
  packageName: string;
  price: string;
  color: string | null;
  details: BackendPackageDetail[];
};

const DEFAULT_COLOR = "bg-blue-600";

function mapPackage(p: BackendPackage): Package {
  const liquidDetergent =
    p.details.find((d) => d.inventory.itemName === "Liquid Detergent" && d.inventory.unit === "Sachet")
      ?.quantity ?? 0;
  const downy = p.details.find((d) => d.inventory.itemName === "Downy")?.quantity ?? 0;

  return {
    id: p.id,
    name: p.packageName,
    price: Number(p.price),
    liquidDetergent,
    downy,
    color: p.color ?? DEFAULT_COLOR,
  };
}

// Packages only ever consume these two specific Inventory rows — same
// name+unit disambiguation the frontend already relies on elsewhere (see
// isCriticalInventoryItem in inventory.service.ts). Looked up by name/unit
// rather than a stored id since the form only exposes simple quantity
// fields, not a full ingredient picker.
async function buildDetails(
  liquidDetergent: number,
  downy: number
): Promise<{ inventoryId: string; quantity: number }[]> {
  const inventory = await getInventory();
  const details: { inventoryId: string; quantity: number }[] = [];

  const sachet = inventory.find((i) => i.name === "Liquid Detergent" && i.unit === "Sachet");
  if (sachet && liquidDetergent > 0) {
    details.push({ inventoryId: sachet.id, quantity: liquidDetergent });
  }

  const downyItem = inventory.find((i) => i.name === "Downy");
  if (downyItem && downy > 0) {
    details.push({ inventoryId: downyItem.id, quantity: downy });
  }

  return details;
}

export async function getPackages(): Promise<Package[]> {
  const { packages } = await apiClient.get<{ packages: BackendPackage[] }>("/packages");
  return packages.map(mapPackage);
}

export async function createPackage(data: {
  name: string;
  price: number;
  liquidDetergent: number;
  downy: number;
  color: string;
}): Promise<Package> {
  const details = await buildDetails(data.liquidDetergent, data.downy);
  const { package: created } = await apiClient.post<{ package: BackendPackage }>("/packages", {
    packageName: data.name,
    price: data.price,
    color: data.color,
    details,
  });
  return mapPackage(created);
}

export async function updatePackage(
  id: string,
  data: { name: string; price: number; liquidDetergent: number; downy: number; color: string }
): Promise<Package> {
  const details = await buildDetails(data.liquidDetergent, data.downy);
  const { package: updated } = await apiClient.patch<{ package: BackendPackage }>(`/packages/${id}`, {
    packageName: data.name,
    price: data.price,
    color: data.color,
    details,
  });
  return mapPackage(updated);
}

export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete(`/packages/${id}`);
}
