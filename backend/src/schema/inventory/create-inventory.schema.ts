import { z } from "zod";
import { shortTextRule } from "../common/validation-rules.js";

export const createInventorySchema = z.object({
  body: z.object({
    itemName: shortTextRule("Item name"),

    quantity: z
      .number({ message: "Quantity is required" })
      .int("Quantity must be a whole number")
      .nonnegative("Quantity cannot be negative"),

    unit: shortTextRule("Unit", 20),

    unitPrice: z
      .number({ message: "Unit price is required" })
      .positive("Unit price must be greater than zero"),

    lowStockThreshold: z
      .number({ message: "Low stock threshold is required" })
      .int("Low stock threshold must be a whole number")
      .nonnegative("Low stock threshold cannot be negative"),
  }),
});
