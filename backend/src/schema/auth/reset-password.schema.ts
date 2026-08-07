import { z } from "zod";
import { passwordRule } from "../common/validation-rules.js";

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().nonempty("Token is required"),
    newPassword: passwordRule,
    confirmPassword: passwordRule,
  }),
}).refine(
  (data) => data.body.newPassword === data.body.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["body", "confirmPassword"],
  }
);
