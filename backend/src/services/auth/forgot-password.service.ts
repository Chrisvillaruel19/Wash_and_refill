import crypto from "crypto";

import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { sendMail, isMailRateLimitError } from "../../lib/mailer.js";
import { ENV } from "../../config/env.js";
import { AccountStatus } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

const RESET_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
// At most one reset email per account per this window. Double-clicks and
// impatient retries were each sending a real email through Gmail, which
// both spams the inbox and runs into Gmail's own sending limits.
const RESEND_COOLDOWN_MS = 60 * 1000;

// Same response regardless of whether the email exists or which role it
// belongs to, so this endpoint can't be used to enumerate accounts.
const GENERIC_SUCCESS = {
  code: 200,
  status: "success",
  message: "If an account with that email exists, a password reset link has been sent.",
};

// Self-service for Admin and Staff alike — every account has its own
// required, unique email. An Admin can still set a Staff password directly
// from Employee Management (e.g. staff who lost access to their inbox).
export async function forgotPasswordService(email: string) {

  try {

    // Case-insensitive: people type their Gmail address with whatever
    // capitalization, and Gmail itself ignores case.
    const user = await userRepository.findByEmailInsensitive(email.trim());

    // Archived/inactive accounts can't log in (login.service.ts), so a reset
    // link would be useless — silently answer the same as "no account".
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      return GENERIC_SUCCESS;
    }

    // Within the cooldown, answer exactly as if a new email went out — the
    // one just sent is still on its way. Deliberately the same generic
    // response (not a "please wait" error), so the cooldown can't be used
    // to learn which emails have accounts.
    const latest = await tokenRepository.findLatestResetTokenForUser(user.id);
    if (latest && latest.expiresAt.getTime() - RESET_TOKEN_LIFETIME_MS > Date.now() - RESEND_COOLDOWN_MS) {
      return GENERIC_SUCCESS;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");


    await tokenRepository.createResetToken({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
    });

    // The token is only ever sent via email, never returned in the API
    // response — returning it here would let anyone who knows a registered
    // email reset that account's password without touching their inbox.
    const resetLink = `${ENV.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendMail(
      user.email,
      "Reset your WRLMS password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${resetLink}">Click here to reset your password</a>. This link expires in 15 minutes.</p>
       <p>If you didn't request this, you can safely ignore this email.</p>`
    );

    return GENERIC_SUCCESS;


  } catch(error) {

    console.error("ForgotPasswordService error:", error);

    if (isMailRateLimitError(error)) {
      return {
        code: 429,
        status: "error",
        message: "Too many reset emails were sent recently. Please wait a few minutes and try again."
      };
    }


    return {
      code: 500,
      status: "error",
      // Almost always the email failing to send (see mailer.ts; the real
      // cause is in the log line above).
      message: "We couldn't send the reset email right now. Please try again later or ask your Administrator."
    };

  }

}