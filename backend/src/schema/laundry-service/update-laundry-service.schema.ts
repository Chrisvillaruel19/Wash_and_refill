import { z } from "zod";
import { ItemType } from "../../../generated/prisma/client.js";

export const updateLaundryServiceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid laundry service id"),
  }),
  body: z
    .object({
      serviceName: z.string().min(1, "Service name is required").optional(),
      itemType: z.enum(ItemType, { message: "Invalid item type" }).optional(),
      price: z.number().nonnegative("Price cannot be negative").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
