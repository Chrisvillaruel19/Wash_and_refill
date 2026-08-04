import { z } from "zod";
import { phoneNumberRule } from "../customer/phone-param.schema.js";

// phoneNumberRule.optional() only skips validation for `undefined` — a
// blank <input> submits "", which still hits .min(7)/the regex and fails
// with a confusing "too short" error despite the field being optional.
// preprocess normalizes "" to undefined first so leaving it blank behaves
// like actually omitting it.
const optionalPhone = z.preprocess(
  (val) => (val === "" ? undefined : val),
  phoneNumberRule.optional()
);

export const createEmployeeSchema = z.object({
  body: z.object({
    username: z
      .string({ message: "Username is required" })
      .min(3, "Username must be at least 3 characters long"),

    email: z
      .string({ message: "Email is required" })
      .email("Invalid email format"),

    name: z
      .string({ message: "Name is required" })
      .min(1, "Name is required"),

    password: z
      .string({ message: "Password is required" })
      .min(8, "Password must be at least 8 characters"),

    phone: optionalPhone,

    hiredDate: z.coerce.date({ message: "Hired date is required" }),
  }),
});
