import { Package } from "../staff/(dashboard)/neworder/types";
import { addActivityLog } from "../staff/(dashboard)/localActivity";

const PACKAGES_KEY = "wrlms_packages";

// Mirrors the hardcoded array that used to live in neworder/data.ts exactly,
// so nothing that currently works (New Order, Shift Handover) changes
// behavior for anyone whose browser has never had wrlms_packages before.
const DEFAULT_PACKAGES: Package[] = [
  { id: "basic", name: "Basic", price: 199, liquidDetergent: 1, downy: 1, color: "bg-green-600" },
  { id: "double", name: "Double", price: 219, liquidDetergent: 2, downy: 2, color: "bg-blue-600" },
  { id: "ultra", name: "Ultra", price: 239, liquidDetergent: 3, downy: 3, color: "bg-purple-600" },
  { id: "legendary", name: "Legendary", price: 259, liquidDetergent: 4, downy: 4, color: "bg-orange-500" },
];

export function getStoredPackages(): Package[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKAGES_KEY);
    if (!raw) {
      localStorage.setItem(PACKAGES_KEY, JSON.stringify(DEFAULT_PACKAGES));
      return DEFAULT_PACKAGES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PACKAGES;
  }
}

function savePackages(items: Package[]) {
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(items));
}

export function addPackage(pkg: Omit<Package, "id">): Package[] {
  const items = getStoredPackages();

  const newPackage: Package = {
    ...pkg,
    id: `${Date.now()}`,
  };

  const updated = [newPackage, ...items];
  savePackages(updated);

  addActivityLog({
    type: "add",
    message: `Admin added a new package: ${newPackage.name}`,
  });

  return updated;
}

// Unlike localInventory.ts's updateItem() (which only logs currentStock
// changes — a known tracked gap), this new function logs every changed
// field with a before→after diff, since it's new code with no reason to
// repeat that limitation.
export function updatePackage(id: string, updates: Partial<Omit<Package, "id">>): Package[] {
  const items = getStoredPackages();
  const target = items.find((p) => p.id === id);

  const updated = items.map((p) => (p.id === id ? { ...p, ...updates } : p));
  savePackages(updated);

  if (target) {
    const changes = (Object.keys(updates) as (keyof typeof updates)[])
      .filter((key) => updates[key] !== undefined && updates[key] !== target[key])
      .map((key) => `${key}: ${target[key]} → ${updates[key]}`)
      .join(", ");

    if (changes) {
      addActivityLog({
        type: "update",
        message: `Admin updated package "${target.name}" (${changes})`,
      });
    }
  }

  return updated;
}

export function deletePackage(id: string): Package[] {
  const items = getStoredPackages();
  const target = items.find((p) => p.id === id);

  const updated = items.filter((p) => p.id !== id);
  savePackages(updated);

  if (target) {
    addActivityLog({
      type: "delete",
      message: `Admin removed package: ${target.name}`,
    });
  }

  return updated;
}
