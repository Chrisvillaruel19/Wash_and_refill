export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ServiceItemOption {
  id: string;
  name: string;
  pricePerKg: number;
}

export interface ServiceItem {
  id: string;
  categoryId: string;
  name: string;
  pricePerKg: number;
}

export type ServiceType = "Wash & Dry" | "Wash Only" | "Dry Only";

// One row of a package's recipe — any Inventory item, any quantity, not
// limited to a fixed set of named ingredients.
export interface PackageIngredient {
  inventoryId: string;
  itemName: string;
  unit: string;
  quantity: number;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  details: PackageIngredient[];
  color: string;
}

export interface SupplyItem {
  id: string;
  name: string;
  price: number;
  unit: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  // What this line becomes in the real order payload (POST /orders' three
  // discriminated item types). weight is only ever set for SERVICE lines —
  // packages and supplies are priced by quantity alone.
  sourceType: "PACKAGE" | "SERVICE" | "INVENTORY";
  sourceId: string;
  weight?: number;
  // Only ever set for SERVICE lines — which of the three physical
  // operations (wash+dry / wash-only / dry-only) this line represents.
  serviceType?: ServiceType;
}

// Canonical definition now lives on Order (../types.ts), since payment
// method is persisted on the order itself. Re-exported here so existing
// imports from this file (checkout UI) don't need to change.
export type { PaymentMethod } from "../types";