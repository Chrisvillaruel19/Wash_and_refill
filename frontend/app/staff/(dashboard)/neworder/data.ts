import { SupplyItem, ServiceCategory } from "./types";

export const serviceCategories: ServiceCategory[] = [
  { id: "clothes", name: "Clothes", icon: "Shirt" },
  { id: "rugs", name: "Rugs & Fleece Blanket", icon: "Layers" },
  { id: "household", name: "Household Items", icon: "LayoutGrid" },
  { id: "carpet", name: "Carpet", icon: "Square" },
  { id: "dryclean", name: "Dry Clean 7days", icon: "Shirt" },
];

export const supplies: SupplyItem[] = [
  { id: "fabcon", name: "Fabcon", price: 30, unit: "Liters" },
  { id: "liquid-detergent-sachet", name: "Liquid Detergent (Sachet)", price: 30, unit: "Sachet" },
  { id: "bleach", name: "Bleach", price: 10, unit: "Liters" },
  { id: "downy", name: "Downy", price: 40, unit: "Liters" },
  { id: "liquid-detergent-liters", name: "Liquid Detergent (Liters)", price: 35, unit: "Liters" },
  { id: "plastic", name: "Plastic", price: 5, unit: "Liters" },
];