import { z } from "zod";
import { nameRule } from "../common/validation-rules.js";

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid customer id"),
  }),
  body: z.object({
    customerName: nameRule,
  }),
});
