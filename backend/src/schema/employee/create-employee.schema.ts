import { z } from "zod";
import { optionalPhoneNumberRule, nameRule, usernameRule, passwordRule } from "../common/validation-rules.js";

export const createEmployeeSchema = z.object({
  body: z.object({
    username: usernameRule,

    email: z
      .string({ message: "Email is required" })
      .trim()
      // Stored lowercase (as every existing account already is) so the same
      // address can never register twice with different capitalization.
      .toLowerCase()
      .max(254, "Email must be at most 254 characters")
      .email("Please enter a valid email address."),

    name: nameRule,

    password: passwordRule,

    phone: optionalPhoneNumberRule(),

    hiredDate: z.coerce.date({ message: "Hired date is required" }),
  }),
});
