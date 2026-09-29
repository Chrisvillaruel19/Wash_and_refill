import { z } from "zod";

// Admin-only counterpart of restockInventorySchema — no PIN, since the
// route itself is restricted to the ADMIN role (the PIN exists so Staff can
// prove an Admin authorized the restock; an Admin needs no such proof).
export const adminRestockInventorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z.object({
    quantity: z
      .number({ message: "Quantity to add is required" })
      .int("Quantity must be a whole number")
      .positive("Quantity to add must be greater than zero"),
  }),
});
