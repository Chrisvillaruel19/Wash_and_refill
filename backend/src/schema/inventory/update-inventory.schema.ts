import { z } from "zod";
import { shortTextRule } from "../common/validation-rules.js";

export const updateInventorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z
    .object({
      itemName: shortTextRule("Item name").optional(),
      quantity: z.number().int("Quantity must be a whole number").nonnegative("Quantity cannot be negative").optional(),
      unit: shortTextRule("Unit", 20).optional(),
      unitPrice: z.number().positive("Unit price must be greater than zero").optional(),
      lowStockThreshold: z
        .number()
        .int("Low stock threshold must be a whole number")
        .nonnegative("Low stock threshold cannot be negative")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
