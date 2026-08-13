import { TokenRepository } from "../../repositories/token.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { signAccessToken, signRefreshToken, TokenExpiry, verifyRefreshToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";

export async function RefreshTokenService(refreshToken: string) {
  const tokenRepository = new TokenRepository();
  const userRepository = new UserRepository();

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { code: 401, status: "error", message: "Invalid refresh token" };
    }

    const storedToken = await tokenRepository.findActiveRefreshToken(refreshToken);
    if (!storedToken) {
      return { code: 401, status: "error", message: "Invalid or expired refresh token" };
    }

    // Re-check the user's current status on every refresh — otherwise a
    // deactivated account keeps working until its refresh token naturally
    // expires (up to 7 days), regardless of when an Admin deactivated it.
    // This also gets the user's current role, needed to embed a fresh role
    // claim in the new access token below.
    const user = await userRepository.findById(payload.sub);
    if (!user || user.accountStatus !== "ACTIVE") {
      return { code: 403, status: "error", message: "Account is not active" };
    }

    const newAccessToken = signAccessToken(user.id, user.role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const newRefreshToken = signRefreshToken(user.id, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    // Consuming the old token and issuing its replacement must commit
    // together — if either fails, the user must not be left with no valid
    // refresh token (silent forced logout) or two simultaneously-valid ones.
    await prisma.$transaction(async (tx) => {
      await tokenRepository.consumeToken(storedToken.id, tx);
      await tokenRepository.createRefreshToken(
        {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        tx
      );
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
