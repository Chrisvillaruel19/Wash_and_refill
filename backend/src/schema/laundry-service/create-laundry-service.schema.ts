import { z } from "zod";
import { ItemType } from "../../../generated/prisma/client.js";

export const createLaundryServiceSchema = z.object({
  body: z.object({
    serviceName: z
      .string({ message: "Service name is required" })
      .min(1, "Service name is required"),

    itemType: z.enum(ItemType, { message: "Invalid item type" }),

    price: z
      .number({ message: "Price is required" })
      .nonnegative("Price cannot be negative"),
  }),
});
