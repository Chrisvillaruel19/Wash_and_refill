import { ServiceCategory } from "./types";

// Self Service (Wash / Dry machines) is priced per 5 kg instead of per kg,
// and charged proportionally to the exact weight: Wash ₱70 / 5 kg at 7 kg
// = ₱98. Must match SELF_SERVICE_KG_PER_PRICE in the backend's
// create-order.service.ts.
export const SELF_SERVICE_CATEGORY_ID = "selfservice";
export const SELF_SERVICE_KG_PER_PRICE = 5;

// How many kg one catalog price covers for a given category.
export function kgPerPrice(categoryId: string) {
  return categoryId === SELF_SERVICE_CATEGORY_ID ? SELF_SERVICE_KG_PER_PRICE : 1;
}

export const serviceCategories: ServiceCategory[] = [
  { id: "clothes", name: "Clothes", icon: "Shirt" },
  { id: "dryclean", name: "Dry Clean 7days", icon: "Shirt" },
  { id: SELF_SERVICE_CATEGORY_ID, name: "Self Service", icon: "LayoutGrid" },
];
