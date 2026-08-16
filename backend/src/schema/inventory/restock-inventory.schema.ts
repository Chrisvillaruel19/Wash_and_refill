import { z } from "zod";

export const restockInventorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z.object({
    quantity: z
      .number({ message: "Quantity to add is required" })
      .int("Quantity must be a whole number")
      .positive("Quantity to add must be greater than zero"),
    // Short-lived, single-use proof from POST /:id/restock-authorization —
    // never the Admin's password itself. See restock-inventory.service.ts.
    authorizationToken: z.string().min(1, "Restock authorization is required"),
  }),
});
