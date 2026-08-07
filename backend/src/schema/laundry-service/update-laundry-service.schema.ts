import { z } from "zod";
import { ItemType } from "../../../generated/prisma/client.js";
import { shortTextRule } from "../common/validation-rules.js";

export const updateLaundryServiceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid laundry service id"),
  }),
  body: z
    .object({
      serviceName: shortTextRule("Service name").optional(),
      itemType: z.enum(ItemType, { message: "Invalid item type" }).optional(),
      price: z.number().positive("Price must be greater than zero").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
