import { z } from "zod";

export const createInventorySchema = z.object({
  body: z.object({
    itemName: z
      .string({ message: "Item name is required" })
      .min(1, "Item name is required"),

    quantity: z
      .number({ message: "Quantity is required" })
      .int("Quantity must be a whole number")
      .nonnegative("Quantity cannot be negative"),

    unit: z
      .string({ message: "Unit is required" })
      .min(1, "Unit is required"),

    unitPrice: z
      .number({ message: "Unit price is required" })
      .nonnegative("Unit price cannot be negative"),

    lowStockThreshold: z
      .number({ message: "Low stock threshold is required" })
      .int("Low stock threshold must be a whole number")
      .nonnegative("Low stock threshold cannot be negative"),
  }),
});
