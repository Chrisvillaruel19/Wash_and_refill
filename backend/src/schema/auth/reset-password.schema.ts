import { z } from "zod";

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().nonempty("Token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters long"),
  }),
}).refine(
  (data) => data.body.newPassword === data.body.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["body", "confirmPassword"],
  }
);
