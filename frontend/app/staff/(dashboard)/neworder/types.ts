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

export interface Package {
  id: string;
  name: string;
  price: number;
  liquidDetergent: number;
  downy: number;
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