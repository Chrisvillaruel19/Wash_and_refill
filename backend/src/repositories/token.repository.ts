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

  async createRestockAuthorizationToken(
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
        type: TokenType.RESTOCK_AUTHORIZATION,
      },
    });
  }

  // Read-only lookup, used to resolve which Admin issued a code for the
  // audit log before the atomic consume below. Not itself the enforcement
  // point — a caller that skips this and goes straight to consume is still
  // fully blocked by that method's own WHERE clause.
  async findActiveRestockAuthorizationToken(token: string, tx: PrismaClientOrTx = prisma) {
    return tx.token.findFirst({
      where: {
        token: hashToken(token),
        type: TokenType.RESTOCK_AUTHORIZATION,
        consumedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  // Atomic conditional consume, not read-then-write — mirrors
  // order.repository.ts's updatePaymentStatusIfCurrentlyIs. The WHERE
  // clause re-asserts unconsumed/unrevoked/unexpired at write time, so two
  // concurrent restock requests replaying the same code can't both
  // succeed: the second's updateMany matches 0 rows, treated as "already
  // used." Unlike REFRESH (a self-expiring JWT), this code is a plain
  // opaque value, so expiresAt must be checked here directly — same
  // reasoning as findActiveResetToken above.
  async consumeRestockAuthorizationToken(token: string, tx: PrismaClientOrTx = prisma) {
    return tx.token.updateMany({
      where: {
        token: hashToken(token),
        type: TokenType.RESTOCK_AUTHORIZATION,
        consumedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        consumedAt: new Date(),
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