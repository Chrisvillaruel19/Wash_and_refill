import crypto from "crypto";

import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { sendMail } from "../../lib/mailer.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { ENV } from "../../config/env.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

// Long enough to find the email the same or next day; single-use, hashed at
// rest, revoked whenever a newer link is issued or the address changes.
const VERIFY_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
// One link per account per minute — double-clicks and impatient retries
// otherwise send real emails (and spend the provider's sending quota).
const RESEND_COOLDOWN_MS = 60 * 1000;

export type SendVerificationResult = {
  sent: boolean;
  reason?: "not_found" | "already_verified" | "cooldown" | "send_failed";
};

// Emails a verification link for the account's CURRENT address. Sending
// proves nothing by itself — the address only becomes verified when the
// link is opened (verifyEmailService). The raw token exists only in the
// emailed link: it is stored hashed, never returned, never logged.
export async function sendEmailVerification(
  userId: string,
  options: { forPasswordReset?: boolean } = {}
): Promise<SendVerificationResult> {
  const user = await userRepository.findById(userId);
  if (!user) return { sent: false, reason: "not_found" };
  if (user.emailVerifiedAt) return { sent: false, reason: "already_verified" };

  const latest = await tokenRepository.findLatestEmailVerificationTokenForUser(userId);
  if (latest && latest.expiresAt.getTime() - VERIFY_TOKEN_LIFETIME_MS > Date.now() - RESEND_COOLDOWN_MS) {
    return { sent: false, reason: "cooldown" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.$transaction(async (tx) => {
    await tokenRepository.revokeOutstandingEmailVerificationTokens(userId, tx);
    await tokenRepository.createEmailVerificationToken(
      { userId, token, expiresAt: new Date(Date.now() + VERIFY_TOKEN_LIFETIME_MS) },
      tx
    );
  });

  const link = `${ENV.FRONTEND_URL}/verify-email?token=${token}`;
  const intro = options.forPasswordReset
    ? "<p>We received a request to reset your password. Before a reset link can be sent, please confirm this email address belongs to you.</p>"
    : "<p>Please confirm that this email address belongs to you.</p>";
  const outro = options.forPasswordReset
    ? "<p>After verifying, go back to Forgot Password and request the reset again.</p>"
    : "";
  try {
    await sendMail(
      user.email,
      "Verify your WRLMS email address",
      `${intro}
       <p><a href="${link}">Click here to verify your email address</a>. This link expires in 24 hours.</p>
       ${outro}
       <p>If you didn't expect this email, you can safely ignore it.</p>`
    );
  } catch (error) {
    // Message only — the provider error never contains the link, but the
    // raw token must never reach logs, so nothing request-shaped is printed.
    console.error("sendEmailVerification: delivery failed:", error instanceof Error ? error.message : "unknown error");
    // The link never arrived: revoke it, so it can't be used and doesn't
    // block an immediate retry via the cooldown.
    await tokenRepository.revokeOutstandingEmailVerificationTokens(userId);
    return { sent: false, reason: "send_failed" };
  }
  return { sent: true };
}

// The only place an email becomes verified: a valid, unexpired, unused,
// unrevoked token for that account. Consumed conditionally, so a reused
// link or one racing an email change (which revokes it) is refused.
export async function verifyEmailService(token: string) {
  const INVALID = {
    code: 400,
    status: "error",
    message: "This verification link is invalid or has expired. Please request a new one.",
  };
  try {
    const record = await tokenRepository.findActiveEmailVerificationToken(token);
    if (!record) return INVALID;

    const verified = await prisma.$transaction(async (tx) => {
      const consumed = await tokenRepository.consumeTokenIfActive(record.id, tx);
      if (consumed.count === 0) return false;
      await userRepository.setEmailVerifiedAt(record.userId, new Date(), tx);
      await writeAuditLog(tx, {
        userId: record.userId,
        action: AuditAction.UPDATE,
        module: "Auth",
        description: "Verified email address",
      });
      return true;
    });

    if (!verified) return INVALID;
    return { code: 200, status: "success", message: "Your email address has been verified." };
  } catch (error) {
    console.error("verifyEmailService error:", error instanceof Error ? error.message : "unknown error");
    return { code: 500, status: "error", message: "Unable to verify email right now. Please try again." };
  }
}

// Shared HTTP shape for "send me / send them a link" requests.
export function verificationRequestResponse(result: SendVerificationResult) {
  if (result.sent) return { code: 200, status: "success", message: "Verification email sent. Please check the inbox (and Spam)." };
  switch (result.reason) {
    case "already_verified":
      return { code: 200, status: "success", message: "This email address is already verified." };
    case "cooldown":
      return { code: 429, status: "error", message: "A verification email was just sent. Please wait a minute before requesting another." };
    case "not_found":
      return { code: 404, status: "error", message: "Account not found" };
    default:
      return { code: 502, status: "error", message: "We couldn't send the verification email right now. Please try again later." };
  }
}
