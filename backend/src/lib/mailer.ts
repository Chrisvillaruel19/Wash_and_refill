import dns from "node:dns/promises";
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

// Nodemailer's default SMTP connection timeout was ~2 minutes — the exact
// cause of an earlier "stuck on Sending..." production bug (Render's egress
// to smtp.gmail.com was failing outright). Both transports below are capped
// at 10s so a user is never left waiting minutes on a loading spinner.
const SEND_TIMEOUT_MS = 10_000;

const GMAIL_SMTP_HOST = "smtp.gmail.com";

// Reused while Gmail's IPv4 address stays the same.
let gmailTransport: { address: string; transport: ReturnType<typeof nodemailer.createTransport> } | null = null;

// Always connects over IPv4. Nodemailer picks a random address from BOTH
// smtp.gmail.com's IPv4 and IPv6 records; on networks that advertise IPv6
// but can't actually route it (verified on the shop's own network: IPv6
// connections to Gmail hang until timeout, IPv4 connects in ~60ms), each
// IPv6 pick burned a full SEND_TIMEOUT_MS before falling back — sends took
// 20s+ or failed outright, which surfaced as "We couldn't send the reset
// email right now" on nearly every Forgot Password attempt. TLS still
// verifies the certificate against the real hostname via servername.
async function getGmailTransport() {
  const { address } = await dns.lookup(GMAIL_SMTP_HOST, { family: 4 });
  if (gmailTransport?.address !== address) {
    gmailTransport = {
      address,
      transport: nodemailer.createTransport({
        host: address,
        port: 465,
        secure: true,
        tls: { servername: GMAIL_SMTP_HOST },
        auth: { user: ENV.GMAIL_USER, pass: ENV.GMAIL_APP_PASSWORD },
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
      }),
    };
  }
  return gmailTransport.transport;
}

// Gmail's own sending limits ("try again later" / daily quota) — reported
// as SMTP 421/454, or 550 with enhanced status 5.4.5.
export function isMailRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { responseCode, response } = error as { responseCode?: number; response?: string };
  return responseCode === 421 || responseCode === 454 || (typeof response === "string" && response.includes("5.4.5"));
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
    const transport = await getGmailTransport();
    await transport.sendMail({
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
