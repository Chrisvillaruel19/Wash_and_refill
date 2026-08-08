import { z } from "zod";
import { optionalPhoneNumberRule, nameRule, usernameRule, passwordRule } from "../common/validation-rules.js";

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid employee id"),
  }),
  body: z
    .object({
      username: usernameRule.optional(),
      name: nameRule.optional(),
      email: z.string().trim().max(254, "Email must be at most 254 characters").email("Invalid email format").optional(),
      phone: optionalPhoneNumberRule(),
      hiredDate: z.coerce.date().optional(),
      // Omitted = keep current password. Present = reset to this value.
      password: passwordRule.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
