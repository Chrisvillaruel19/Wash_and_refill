import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

// Nodemailer's default SMTP connection timeout was ~2 minutes — the exact
// cause of an earlier "stuck on Sending..." production bug (Render's egress
// to smtp.gmail.com was failing outright). Both transports below are capped
// at 10s so a user is never left waiting minutes on a loading spinner.
const SEND_TIMEOUT_MS = 10_000;

// Created once, on first use — only when Gmail is configured.
let gmailTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getGmailTransport() {
  gmailTransport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: ENV.GMAIL_USER, pass: ENV.GMAIL_APP_PASSWORD },
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
  return gmailTransport;
}

// Picks the transport in this order:
//  1. Gmail via Nodemailer (GMAIL_USER + GMAIL_APP_PASSWORD) — sends from the
//     shop's own Gmail to any address, no domain needed. Needs outbound SMTP,
//     which some hosts (e.g. Render) block — use Resend there.
//  2. Resend's HTTPS API (RESEND_API_KEY + a verified-domain EMAIL_FROM).
//  3. Neither: log the email to the console (local dev only — production
//     requires one of the above, enforced in config/env.ts).
// Callers get the same sendMail(to, subject, html) either way.
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (ENV.GMAIL_USER && ENV.GMAIL_APP_PASSWORD) {
    // Gmail rewrites any other From address to the account itself anyway.
    await getGmailTransport().sendMail({
      from: `"Wash & Refill Laundry" <${ENV.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return;
  }

  if (!ENV.RESEND_API_KEY) {
    console.log(
      `[DEV MODE] No email transport configured — email not actually sent.\nTo: ${to}\nSubject: ${subject}\n${html}`
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
