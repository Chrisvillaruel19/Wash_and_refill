import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

// Fail fast with a clear message instead of letting a missing DATABASE_URL
// silently become the literal string "undefined" wherever it's read.
const envSchema = z.object({
  DATABASE_URL: z
    .string({ message: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL is required"),
  // Controls the refresh-token cookie's SameSite attribute. Defaults to
  // "lax", which is correct when frontend and backend are deployed on the
  // same site (e.g. subdomains of one root domain) — this is also what
  // local dev needs, since a bare "none" cookie is rejected by browsers
  // over plain HTTP. Set to "none" only when frontend and backend are
  // genuinely on different registrable domains in production; "none"
  // requires HTTPS, so COOKIE_SECURE is forced on automatically below
  // whenever this is "none", regardless of NODE_ENV.
  COOKIE_SAMESITE: z.enum(["lax", "none"]).default("lax"),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsedEnv.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  throw new Error("Missing or invalid required environment variables. See above for details.");
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// FRONTEND_URL/EMAIL_FROM/RESEND_API_KEY are optional in development (safe,
// self-documenting fallbacks — see below), but silently falling back to
// them in a real production deployment would mean: CORS configured for
// localhost (every request blocked, at least it's loud) or, worse, the
// email provider key silently unset and password-reset links quietly
// logged to console/host logs instead of emailed (see mailer.ts) — a real
// credential-exposure risk, not just a broken feature. Fail fast here
// instead, matching the DATABASE_URL/JWT_SECRET pattern above.
if (IS_PRODUCTION) {
  const productionIssues: string[] = [];
  if (!process.env.FRONTEND_URL) productionIssues.push("FRONTEND_URL is required in production");
  if (!process.env.EMAIL_FROM) productionIssues.push("EMAIL_FROM is required in production");
  if (!process.env.RESEND_API_KEY) {
    productionIssues.push("RESEND_API_KEY is required in production (password reset would otherwise silently fail to send)");
  }
  if (productionIssues.length > 0) {
    console.error("Invalid production environment configuration:");
    for (const issue of productionIssues) console.error(` - ${issue}`);
    throw new Error("Missing required production environment variables. See above for details.");
  }
}

export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 8000,
    BACKEND_PORT: process.env.BACKEND_URL ||'http://localhost:8000',
    DATABASE_URL: parsedEnv.data.DATABASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    // CORS allow-list — separate from FRONTEND_URL (which is also used to
    // build the one canonical password-reset link, so it must stay a
    // single URL). Optional, comma-separated; defaults to just
    // FRONTEND_URL so existing single-origin setups are unaffected.
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : [process.env.FRONTEND_URL || 'http://localhost:3000'],
    COOKIE_SAMESITE: parsedEnv.data.COOKIE_SAMESITE,
    // SameSite=None cookies are rejected outright by browsers unless Secure
    // is also set, independent of NODE_ENV (which isn't guaranteed to be
    // set by every hosting platform) — so a cross-site deployment forces
    // this true unconditionally rather than trusting NODE_ENV alone.
    COOKIE_SECURE: parsedEnv.data.COOKIE_SAMESITE === "none" || IS_PRODUCTION,
    // Used by src/lib/mailer.ts to send password-reset emails via Resend's
    // HTTPS API. If unset, the mailer falls back to logging the email
    // content to the console instead of sending it, so local dev works
    // without a real API key. (Unreachable in production — enforced above.)
    // Backend-only: never exposed to the frontend, never NEXT_PUBLIC_*.
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@wrlms.local",
}