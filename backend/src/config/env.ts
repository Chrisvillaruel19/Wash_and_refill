import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

// Fail fast with a clear message instead of letting a missing DATABASE_URL
// silently become the literal string "undefined" wherever it's read.
const envSchema = z.object({
  DATABASE_URL: z
    .string({ message: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL is required"),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsedEnv.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  throw new Error("Missing or invalid required environment variables. See above for details.");
}

export const ENV = {
    PORT: process.env.PORT || 8000,
    BACKEND_PORT: process.env.BACKEND_URL ||'http://localhost:8000',
    DATABASE_URL: parsedEnv.data.DATABASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Used by src/lib/mailer.ts to send password-reset emails. If unset,
    // the mailer falls back to logging the email content to the console
    // instead of sending it, so local dev works without real SMTP creds.
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@wrlms.local",
}