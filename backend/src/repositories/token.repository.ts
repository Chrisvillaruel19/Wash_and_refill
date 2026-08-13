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
      },
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