import { z } from "zod";
import { pinRule } from "../common/validation-rules.js";

export const restockInventorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z.object({
    quantity: z
      .number({ message: "Quantity to add is required" })
      .int("Quantity must be a whole number")
      .positive("Quantity to add must be greater than zero"),
    // The shared Restock Authorization PIN an Admin set from their own
    // account — never the Admin's login password. See
    // restock-inventory.service.ts.
    pin: pinRule,
  }),
});
