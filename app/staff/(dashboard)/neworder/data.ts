import { Package, SupplyItem, ServiceCategory, ServiceItemOption } from "./types";

export const serviceCategories: ServiceCategory[] = [
  { id: "clothes", name: "Clothes", icon: "Shirt" },
  { id: "rugs", name: "Rugs & Fleece Blanket", icon: "Layers" },
  { id: "household", name: "Household Items", icon: "LayoutGrid" },
  { id: "carpet", name: "Carpet", icon: "Square" },
  { id: "dryclean", name: "Dry Clean 7days", icon: "Shirt" },
];

// Placeholder — each category has its own list of item options + pricing.
export const serviceItemsByCategory: Record<string, ServiceItemOption[]> = {
  clothes: [
    { id: "casual-colored", name: "Casual colored", pricePerKg: 30 },
    { id: "casual-white", name: "Casual white", pricePerKg: 35 },
  ],
  rugs: [
    { id: "small-rug", name: "Small rug", pricePerKg: 50 },
    { id: "fleece-blanket", name: "Fleece blanket", pricePerKg: 60 },
  ],
  household: [
    { id: "curtains", name: "Curtains", pricePerKg: 45 },
    { id: "bedsheets", name: "Bedsheets", pricePerKg: 40 },
  ],
  carpet: [
    { id: "small-carpet", name: "Small carpet", pricePerKg: 70 },
    { id: "large-carpet", name: "Large carpet", pricePerKg: 90 },
  ],
  dryclean: [
    { id: "short-sleeve", name: "Short sleeve", pricePerKg: 350 },
    { id: "long-sleeve", name: "Long sleeve", pricePerKg: 400 },
  ],
};

export const packages: Package[] = [
  { id: "basic", name: "Basic", price: 199, liquidDetergent: 1, downy: 1, color: "bg-green-600" },
  { id: "double", name: "Double", price: 219, liquidDetergent: 2, downy: 2, color: "bg-blue-600" },
  { id: "ultra", name: "Ultra", price: 239, liquidDetergent: 3, downy: 3, color: "bg-purple-600" },
  { id: "legendary", name: "Legendary", price: 259, liquidDetergent: 4, downy: 4, color: "bg-orange-500" },
];

export const supplies: SupplyItem[] = [
  { id: "fabcon", name: "Fabcon", price: 30, unit: "Liters" },
  { id: "liquid-detergent-sachet", name: "Liquid Detergent (Sachet)", price: 30, unit: "Sachet" },
  { id: "bleach", name: "Bleach", price: 10, unit: "Liters" },
  { id: "downy", name: "Downy", price: 40, unit: "Liters" },
  { id: "liquid-detergent-liters", name: "Liquid Detergent (Liters)", price: 35, unit: "Liters" },
  { id: "plastic", name: "Plastic", price: 5, unit: "Liters" },
];