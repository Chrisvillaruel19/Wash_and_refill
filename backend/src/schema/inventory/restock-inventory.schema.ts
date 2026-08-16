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
    // The one-time code an Admin generated from their own session and
    // handed to Staff in person — never the Admin's password itself. See
    // restock-inventory.service.ts.
    authorizationCode: z.string().min(1, "Restock authorization code is required"),
  }),
});
