import { z } from "zod";
import { passwordRule } from "../common/validation-rules.js";

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().nonempty("Token is required"),
    newPassword: passwordRule,
    // Only needs to be present and equal to newPassword (checked below) —
    // re-running the length rule on it produced "Password must be at least 8
    // characters" for a merely empty confirmation.
    confirmPassword: z
      .string({ message: "Please confirm your new password." })
      .nonempty("Please confirm your new password."),
  }),
}).refine(
  // An empty confirmation already has its own "required" message above;
  // zod still runs this check after it, so skip it to avoid a second error.
  (data) => !data.body.confirmPassword || data.body.newPassword === data.body.confirmPassword,
  {
    message: "Passwords do not match.",
    path: ["body", "confirmPassword"],
  }
);
