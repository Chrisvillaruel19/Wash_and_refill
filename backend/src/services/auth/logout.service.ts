import { TokenRepository } from "../../repositories/token.repository.js";

const tokenRepository = new TokenRepository();

export async function LogoutService(refreshToken: string) {

  try {

    const token = await tokenRepository.findActiveRefreshToken(refreshToken);

    if (!token) {
      return {
        code: 401,
        status: "error",
        message: "Invalid refresh token"
      };
    }


    await tokenRepository.revokeToken(token.id);


    return {
      code: 200,
      status: "success",
      message: "Logout successful"
    };


  } catch (error) {

    console.error("LogoutService error:", error);

    return {
      code: 500,
      status: "error",
      message: "Unable to logout"
    };

  }

}