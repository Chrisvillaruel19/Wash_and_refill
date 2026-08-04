import { z } from "zod";

const phoneNumberRule = z
  .string({ message: "Phone number is required" })
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters");

export const phoneParamSchema = z.object({
  params: z.object({
    phoneNumber: phoneNumberRule,
  }),
});

export { phoneNumberRule };
