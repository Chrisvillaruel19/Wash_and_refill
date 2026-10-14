import { z } from "zod";

// The link carries a 64-hex-character token (32 random bytes).
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z
      .string({ message: "Verification token is required" })
      .regex(/^[a-f0-9]{64}$/, "This verification link is invalid or has expired. Please request a new one."),
  }),
});
