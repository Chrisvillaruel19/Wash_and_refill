import crypto from "crypto";

import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { sendMail } from "../../lib/mailer.js";
import { ENV } from "../../config/env.js";
import { AccountStatus } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

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

    const resetToken = crypto.randomBytes(32).toString("hex");


    await tokenRepository.createResetToken({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(
        Date.now() + 15 * 60 * 1000
      ),
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


    return {
      code: 500,
      status: "error",
      // Almost always the email failing to send (see mailer.ts; the real
      // cause is in the log line above).
      message: "We couldn't send the reset email right now. Please try again later or ask your Administrator."
    };

  }

}