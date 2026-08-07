import { z } from "zod";
import { phoneNumberRule } from "./phone-param.schema.js";
import { nameRule } from "../common/validation-rules.js";

export const findOrCreateCustomerSchema = z.object({
  body: z.object({
    customerName: nameRule,
    phoneNumber: phoneNumberRule,
  }),
});
