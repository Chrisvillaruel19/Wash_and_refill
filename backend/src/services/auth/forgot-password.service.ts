import crypto from "crypto";

import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { sendMail } from "../../lib/mailer.js";
import { ENV } from "../../config/env.js";
import { Role } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

// Same response regardless of whether the email exists, so this endpoint
// can't be used to enumerate registered accounts.
const GENERIC_SUCCESS = {
  code: 200,
  status: "success",
  message: "If an account with that email exists, a password reset link has been sent.",
};

// Deliberately more specific than GENERIC_SUCCESS: Staff passwords are only
// ever reset by an Admin (Employee Management's existing "Reset password"),
// never self-service. This does mean an email known to belong to a Staff
// account is distinguishable from "no account" — an accepted, deliberate
// tradeoff for this internal tool (see PR/report for the security note).
const STAFF_MANAGED_BY_ADMIN = {
  code: 200,
  status: "success",
  message: "This account is managed by an Administrator. Please contact your Administrator to reset your password.",
};

export async function forgotPasswordService(email: string) {

  try {

    const user = await userRepository.findByEmail(email);

    if (!user) {
      return GENERIC_SUCCESS;
    }

    if (user.role !== Role.ADMIN) {
      return STAFF_MANAGED_BY_ADMIN;
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
      message: "Unable to process forgot password"
    };

  }

}