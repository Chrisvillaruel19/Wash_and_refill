import { z } from "zod";
import { phoneNumberRule } from "./phone-param.schema.js";

export const findOrCreateCustomerSchema = z.object({
  body: z.object({
    customerName: z
      .string({ message: "Customer name is required" })
      .min(1, "Customer name is required"),

    phoneNumber: phoneNumberRule,
  }),
});
