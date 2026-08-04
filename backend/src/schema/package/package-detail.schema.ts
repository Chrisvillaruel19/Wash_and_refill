import { z } from "zod";

export const packageDetailSchema = z.object({
  inventoryId: z.string().uuid("Invalid inventory id"),
  quantity: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
});
