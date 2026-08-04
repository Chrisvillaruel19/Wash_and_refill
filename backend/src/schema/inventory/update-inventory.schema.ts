import { z } from "zod";

export const updateInventorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z
    .object({
      itemName: z.string().min(1, "Item name is required").optional(),
      quantity: z.number().int("Quantity must be a whole number").nonnegative("Quantity cannot be negative").optional(),
      unit: z.string().min(1, "Unit is required").optional(),
      unitPrice: z.number().nonnegative("Unit price cannot be negative").optional(),
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
