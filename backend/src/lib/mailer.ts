import { ENV } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

// Nodemailer's default SMTP connection timeout was ~2 minutes — the exact
// cause of the "stuck on Sending..." production bug this replaced (Render's
// egress to smtp.gmail.com:587 was failing outright). A transactional email
// API over HTTPS should respond in well under a second; 10s is generous
// headroom for a genuine network hiccup while still failing fast enough
// that a user is never left waiting minutes on a loading spinner.
const SEND_TIMEOUT_MS = 10_000;

// Uses Resend's HTTPS API when configured; otherwise falls back to logging
// the email content to the console, so local dev works without a real API
// key. Either way, callers get the same sendMail(to, subject, html)
// interface — forgot-password.service.ts never needs to know which path
// ran. RESEND_API_KEY is validated as required-in-production by
// config/env.ts, so by the time this runs in production the key is
// guaranteed to be set; the fallback below is only ever reachable locally.
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!ENV.RESEND_API_KEY) {
    console.log(
      `[DEV MODE] RESEND_API_KEY not configured — email not actually sent.\nTo: ${to}\nSubject: ${subject}\n${html}`
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: ENV.EMAIL_FROM, to, subject, html }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Safe to log the provider's response text — Resend never echoes the
      // API key back (that only ever goes out in the Authorization header),
      // and this is the response body, not our outgoing request (which is
      // the only place the raw reset-link token appears).
      const body = await res.text().catch(() => "");
      throw new Error(`Resend request failed: ${res.status} ${res.statusText} ${body}`.trim());
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Resend request timed out after ${SEND_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
