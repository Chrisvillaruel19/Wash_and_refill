import { ServiceCategory } from "./types";

export const legacyServiceCategoryNames: Record<string, string> = {
  rugs: "Rugs & Fleece Blanket (legacy)",
  household: "Household Items (legacy)",
  carpet: "Carpet (legacy)",
};

export const serviceCategories: ServiceCategory[] = [
  { id: "clothes", name: "Full Service", icon: "Shirt" },
  { id: "dryclean", name: "Dry Clean 7days", icon: "Shirt" },
];