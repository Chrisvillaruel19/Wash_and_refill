import { z } from "zod";
import { optionalPhoneNumberRule, nameRule, usernameRule, passwordRule } from "../common/validation-rules.js";

export const createEmployeeSchema = z.object({
  body: z.object({
    username: usernameRule,

    email: z
      .string({ message: "Email is required" })
      .trim()
      .max(254, "Email must be at most 254 characters")
      .email("Invalid email format"),

    name: nameRule,

    password: passwordRule,

    phone: optionalPhoneNumberRule(),

    hiredDate: z.coerce.date({ message: "Hired date is required" }),
  }),
});
