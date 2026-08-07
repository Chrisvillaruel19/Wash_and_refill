import { z } from "zod";
import { ItemType } from "../../../generated/prisma/client.js";
import { shortTextRule } from "../common/validation-rules.js";

export const createLaundryServiceSchema = z.object({
  body: z.object({
    serviceName: shortTextRule("Service name"),

    itemType: z.enum(ItemType, { message: "Invalid item type" }),

    price: z
      .number({ message: "Price is required" })
      .positive("Price must be greater than zero"),
  }),
});
