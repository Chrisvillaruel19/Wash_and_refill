import { apiClient } from "../apiClient";
import { Package, PackageIngredient } from "../../staff/(dashboard)/neworder/types";

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
  const details: PackageIngredient[] = p.details.map((d) => ({
    inventoryId: d.inventory.id,
    itemName: d.inventory.itemName,
    unit: d.inventory.unit,
    quantity: d.quantity,
  }));

  return {
    id: p.id,
    name: p.packageName,
    price: Number(p.price),
    details,
    color: p.color ?? DEFAULT_COLOR,
  };
}

export async function getPackages(): Promise<Package[]> {
  const { packages } = await apiClient.get<{ packages: BackendPackage[] }>("/packages");
  return packages.map(mapPackage);
}

export async function createPackage(data: {
  name: string;
  price: number;
  color: string;
  details: { inventoryId: string; quantity: number }[];
}): Promise<Package> {
  const { package: created } = await apiClient.post<{ package: BackendPackage }>("/packages", {
    packageName: data.name,
    price: data.price,
    color: data.color,
    details: data.details,
  });
  return mapPackage(created);
}

export async function updatePackage(
  id: string,
  data: { name: string; price: number; color: string; details: { inventoryId: string; quantity: number }[] }
): Promise<Package> {
  const { package: updated } = await apiClient.patch<{ package: BackendPackage }>(`/packages/${id}`, {
    packageName: data.name,
    price: data.price,
    color: data.color,
    details: data.details,
  });
  return mapPackage(updated);
}

export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete(`/packages/${id}`);
}
