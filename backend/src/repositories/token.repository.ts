import { prisma } from "../lib/prisma.js";
import { Prisma, TokenType } from "../../generated/prisma/client.js";
import type { Token } from "../../generated/prisma/client.js";
import { hashToken } from "../utils/token-hash.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Tokens are stored and looked up by SHA-256 hash, never the raw value —
// callers (services) still pass/receive the raw token throughout; hashing
// is entirely internal to this repository. If the database were ever
// exposed, these rows alone would not be directly usable as live sessions.
export class TokenRepository {
  async createRefreshToken(
    params: {
      userId: string;
      token: string;
      expiresAt: Date;
    },
    tx: PrismaClientOrTx = prisma
  ) {

    const { userId, token, expiresAt } = params;

    return tx.token.create({
      data: {
        userId,
        token: hashToken(token),
        expiresAt,
        type: TokenType.REFRESH,
      },
    });
  }

  async createResetToken(
    params: {
      userId: string;
      token: string;
      expiresAt: Date;
    },
    tx: PrismaClientOrTx = prisma
  ) {

    const { userId, token, expiresAt } = params;

    return tx.token.create({
      data: {
        userId,
        token: hashToken(token),
        expiresAt,
        type: TokenType.RESET_PASSWORD,
      },
    });

  }

  async findActiveRefreshToken(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        token: hashToken(token),
        type: TokenType.REFRESH,
        consumedAt: null,
        revokedAt: null,
        // Belt-and-suspenders alongside the JWT's own exp claim (already
        // checked by verifyRefreshToken before this is ever called) — keeps
        // this query correct on its own if the two ever diverge.
        expiresAt: { gt: new Date() },
      },
    });
  }

  // Reuse-detection lookup: finds the row regardless of consumed/revoked/
  // expired state, so a caller can tell "never existed" apart from "existed
  // but was already consumed" (a signal of token theft/replay — a valid
  // refresh token should only ever be presented once, since it's rotated
  // away immediately on use).
  async findRefreshTokenByRawValue(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: { token: hashToken(token), type: TokenType.REFRESH },
    });
  }

  // Reuse-detection response: revoke every other still-active refresh token
  // for this user, forcing re-login everywhere. Session hijacking succeeds
  // (in the worst case) only until the legitimate device's next refresh
  // attempt collides with the attacker's already-consumed token.
  async revokeAllActiveRefreshTokensForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.token.updateMany({
      where: { userId, type: TokenType.REFRESH, consumedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }



async findActiveResetToken(token: string): Promise<Token | null> {

  return prisma.token.findFirst({
    where: {
      token: hashToken(token),
      type: TokenType.RESET_PASSWORD,
      consumedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

  async consumeToken(id: string, tx: PrismaClientOrTx = prisma) {

    return tx.token.update({
      where: {
        id,
      },
      data: {
        consumedAt: new Date(),
      },
    });

  }


  async revokeToken(id: string, tx: PrismaClientOrTx = prisma) {

    return tx.token.update({
      where: {
        id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

  }

}