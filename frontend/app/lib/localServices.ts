import { ServiceItem } from "../staff/(dashboard)/neworder/types";
import { addActivityLog } from "../staff/(dashboard)/localActivity";

const SERVICES_KEY = "wrlms_services";

// Mirrors the hardcoded serviceItemsByCategory that used to live in
// neworder/data.ts exactly, flattened with categoryId added, so nothing
// that currently works (New Order) changes behavior for anyone whose
// browser has never had wrlms_services before.
const DEFAULT_SERVICES: ServiceItem[] = [
  { id: "casual-colored", categoryId: "clothes", name: "Casual colored", pricePerKg: 30 },
  { id: "casual-white", categoryId: "clothes", name: "Casual white", pricePerKg: 35 },
  { id: "small-rug", categoryId: "rugs", name: "Small rug", pricePerKg: 50 },
  { id: "fleece-blanket", categoryId: "rugs", name: "Fleece blanket", pricePerKg: 60 },
  { id: "curtains", categoryId: "household", name: "Curtains", pricePerKg: 45 },
  { id: "bedsheets", categoryId: "household", name: "Bedsheets", pricePerKg: 40 },
  { id: "small-carpet", categoryId: "carpet", name: "Small carpet", pricePerKg: 70 },
  { id: "large-carpet", categoryId: "carpet", name: "Large carpet", pricePerKg: 90 },
  { id: "short-sleeve", categoryId: "dryclean", name: "Short sleeve", pricePerKg: 350 },
  { id: "long-sleeve", categoryId: "dryclean", name: "Long sleeve", pricePerKg: 400 },
];

export function getStoredServices(): ServiceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (!raw) {
      localStorage.setItem(SERVICES_KEY, JSON.stringify(DEFAULT_SERVICES));
      return DEFAULT_SERVICES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SERVICES;
  }
}

function saveServices(items: ServiceItem[]) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(items));
}

export function addService(item: Omit<ServiceItem, "id">): ServiceItem[] {
  const items = getStoredServices();

  const newService: ServiceItem = {
    ...item,
    id: `${Date.now()}`,
  };

  const updated = [newService, ...items];
  saveServices(updated);

  addActivityLog({
    type: "add",
    message: `Admin added a new service: ${newService.name}`,
  });

  return updated;
}

export function updateService(
  id: string,
  updates: Partial<Omit<ServiceItem, "id">>
): ServiceItem[] {
  const items = getStoredServices();
  const target = items.find((s) => s.id === id);

  const updated = items.map((s) => (s.id === id ? { ...s, ...updates } : s));
  saveServices(updated);

  if (target) {
    const changes = (Object.keys(updates) as (keyof typeof updates)[])
      .filter((key) => updates[key] !== undefined && updates[key] !== target[key])
      .map((key) => `${key}: ${target[key]} → ${updates[key]}`)
      .join(", ");

    if (changes) {
      addActivityLog({
        type: "update",
        message: `Admin updated service "${target.name}" (${changes})`,
      });
    }
  }

  return updated;
}

export function deleteService(id: string): ServiceItem[] {
  const items = getStoredServices();
  const target = items.find((s) => s.id === id);

  const updated = items.filter((s) => s.id !== id);
  saveServices(updated);

  if (target) {
    addActivityLog({
      type: "delete",
      message: `Admin removed service: ${target.name}`,
    });
  }

  return updated;
}
