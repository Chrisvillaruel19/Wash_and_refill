import crypto from "crypto";

import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();


export async function forgotPasswordService(email: string) {

  try {

    const user = await userRepository.findByEmail(email);

    if (!user) {

      return {
        code: 404,
        status: "error",
        message: "Email not found"
      };

    }


    const resetToken = crypto.randomBytes(32).toString("hex");


    await tokenRepository.createResetToken({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(
        Date.now() + 15 * 60 * 1000
      ),
    });

    return {
      code: 200,
      status: "success",
      message: "Password reset request created",
      data: {
        token: resetToken
      }
    };


  } catch(error) {

    console.error("ForgotPasswordService error:", error);


    return {
      code: 500,
      status: "error",
      message: "Unable to process forgot password"
    };

  }

}