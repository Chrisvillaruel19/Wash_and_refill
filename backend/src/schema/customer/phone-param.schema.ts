import { z } from "zod";
import { phoneNumberRule } from "../common/validation-rules.js";

export const phoneParamSchema = z.object({
  params: z.object({
    phoneNumber: phoneNumberRule,
  }),
});

export { phoneNumberRule };
