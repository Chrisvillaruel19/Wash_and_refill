import dns from "node:dns/promises";
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const MAILJET_API_URL = "https://api.mailjet.com/v3.1/send";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

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

// Provider sending limits — Gmail reports "try again later" / daily quota
// as SMTP 421/454, or 550 with enhanced status 5.4.5; Brevo/Resend as HTTP 429.
export function isMailRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { responseCode, response } = error as { responseCode?: number; response?: string };
  return (
    responseCode === 421 ||
    responseCode === 454 ||
    responseCode === 429 ||
    (typeof response === "string" && response.includes("5.4.5"))
  );
}

// POSTs JSON to an email provider's HTTPS API, capped at SEND_TIMEOUT_MS.
async function postEmailApi(provider: string, url: string, headers: Record<string, string>, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Safe to log the provider's response text — neither provider echoes
      // the API key back (that only ever goes out in a request header), and
      // this is the response body, not our outgoing request (which is the
      // only place the raw reset-link token appears).
      const text = await res.text().catch(() => "");
      const error = new Error(`${provider} request failed: ${res.status} ${res.statusText} ${text}`.trim());
      // Lets isMailRateLimitError recognise the provider's 429.
      Object.assign(error, { responseCode: res.status });
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${provider} request timed out after ${SEND_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Gmail API access tokens last ~1 hour; reuse one until shortly before expiry.
let gmailApiToken: { value: string; expiresAt: number } | null = null;

// Trades the long-lived refresh token (from scripts/gmail-refresh-token.mjs)
// for a short-lived access token.
async function getGmailApiAccessToken(): Promise<string> {
  if (gmailApiToken && gmailApiToken.expiresAt > Date.now() + 60_000) return gmailApiToken.value;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.GMAIL_CLIENT_ID!,
      client_secret: ENV.GMAIL_CLIENT_SECRET!,
      refresh_token: ENV.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!res.ok) {
    // e.g. "invalid_grant" — the refresh token was revoked or expired
    // (it expires after 7 days if the OAuth app is left in "Testing").
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail API token refresh failed: ${res.status} ${text}`.trim());
  }
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  gmailApiToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}

// RFC 2047 encoding so non-ASCII (and "&") in headers survive intact.
function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

// The Gmail API takes a whole RFC 822 message, base64url-encoded.
function buildRawMessage(from: string, to: string, subject: string, html: string): string {
  const message = [
    `From: ${encodeHeader("Wash & Refill Laundry")} <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

// Picks the transport in this order:
//  0. Gmail API over HTTPS (GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET +
//     GMAIL_REFRESH_TOKEN + GMAIL_USER) — sends as the shop's real Gmail,
//     free, no third-party account review, and works on hosts that block
//     SMTP (Render). Best inbox placement of all the options.
//  1. Mailjet's HTTPS API (MAILJET_API_KEY + MAILJET_SECRET_KEY + EMAIL_FROM)
//     — free (200/day), no domain needed: EMAIL_FROM only has to be a sender
//     verified in Mailjet. Works on hosts that block SMTP, like Render.
//  2. Brevo's HTTPS API (BREVO_API_KEY + EMAIL_FROM) — same idea, free
//     (300/day), EMAIL_FROM must be a sender verified in Brevo.
//  3. Gmail via Nodemailer (GMAIL_USER + GMAIL_APP_PASSWORD) — sends from the
//     shop's own Gmail to any address, no domain needed. Needs outbound SMTP,
//     which some hosts (e.g. Render) block — use Mailjet or Brevo there.
//  4. Resend's HTTPS API (RESEND_API_KEY + a verified-domain EMAIL_FROM).
//  5. None: log the email to the console (local dev only — production
//     requires one of the above, enforced in config/env.ts).
// Callers get the same sendMail(to, subject, html) either way.
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (ENV.GMAIL_CLIENT_ID && ENV.GMAIL_CLIENT_SECRET && ENV.GMAIL_REFRESH_TOKEN && ENV.GMAIL_USER) {
    const accessToken = await getGmailApiAccessToken();
    await postEmailApi(
      "Gmail API",
      GMAIL_API_SEND_URL,
      { Authorization: `Bearer ${accessToken}` },
      { raw: buildRawMessage(ENV.GMAIL_USER, to, subject, html) }
    );
    return;
  }

  if (ENV.MAILJET_API_KEY && ENV.MAILJET_SECRET_KEY) {
    const credentials = Buffer.from(`${ENV.MAILJET_API_KEY}:${ENV.MAILJET_SECRET_KEY}`).toString("base64");
    await postEmailApi(
      "Mailjet",
      MAILJET_API_URL,
      { Authorization: `Basic ${credentials}` },
      {
        Messages: [
          {
            From: { Email: ENV.EMAIL_FROM, Name: "Wash & Refill Laundry" },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      }
    );
    return;
  }

  if (ENV.BREVO_API_KEY) {
    await postEmailApi(
      "Brevo",
      BREVO_API_URL,
      { "api-key": ENV.BREVO_API_KEY },
      {
        sender: { name: "Wash & Refill Laundry", email: ENV.EMAIL_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }
    );
    return;
  }

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

  await postEmailApi(
    "Resend",
    RESEND_API_URL,
    { Authorization: `Bearer ${ENV.RESEND_API_KEY}` },
    { from: ENV.EMAIL_FROM, to, subject, html }
  );
}
