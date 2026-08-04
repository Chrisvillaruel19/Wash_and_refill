import { z } from "zod";
import { phoneNumberRule } from "../customer/phone-param.schema.js";

// See create-employee.schema.ts — "" from a blank <input> must behave like
// omitted, not fail phoneNumberRule's min-length/regex checks.
const optionalPhone = z.preprocess(
  (val) => (val === "" ? undefined : val),
  phoneNumberRule.optional()
);

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid employee id"),
  }),
  body: z
    .object({
      username: z.string().min(3, "Username must be at least 3 characters long").optional(),
      name: z.string().min(1, "Name is required").optional(),
      email: z.string().email("Invalid email format").optional(),
      phone: optionalPhone,
      hiredDate: z.coerce.date().optional(),
      // Omitted = keep current password. Present = reset to this value.
      password: z.string().min(8, "Password must be at least 8 characters").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
