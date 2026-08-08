import { z } from "zod";

export const verifyPasswordSchema = z.object({
  body: z.object({
    username: z.string().min(3, "Username must be at least 3 characters long"),
    password: z.string().min(1, "Password is required"),
  }),
});
