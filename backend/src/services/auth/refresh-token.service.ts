import { TokenRepository } from "../../repositories/token.repository.js";
import { signAccessToken, signRefreshToken, TokenExpiry, verifyRefreshToken } from "../../lib/jwt.js";

export async function RefreshTokenService(refreshToken: string) {
  const tokenRepository = new TokenRepository();

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { code: 401, status: "error", message: "Invalid refresh token" };
    }

    const storedToken = await tokenRepository.findActiveRefreshToken(refreshToken);
    if (!storedToken) {
      return { code: 401, status: "error", message: "Invalid or expired refresh token" };
    }

    const newAccessToken = signAccessToken(payload.sub, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const newRefreshToken = signRefreshToken(payload.sub, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    await tokenRepository.consumeToken(storedToken.id);
    await tokenRepository.createRefreshToken({
      userId: payload.sub,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      code: 200,
      status: "success",
      message: "Refresh token rotated successfully",
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: TokenExpiry.ACCESS_TOKEN_EXPIRES,
          refreshExpiresIn: TokenExpiry.REFRESH_TOKEN_EXPIRES,
        },
      },
    };
  } catch (error) {
    console.error("RefreshTokenService Error", error);
    return { code: 500, status: "error", message: "Unable to refresh token" };
  }
}
