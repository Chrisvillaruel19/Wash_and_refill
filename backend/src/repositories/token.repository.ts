import { prisma } from "../lib/prisma.js";
import { TokenType } from "../../generated/prisma/client.js";
import type { Token } from "../../generated/prisma/client.js";

export class TokenRepository {
  async createRefreshToken(params: { 
    userId: string; 
    token: string; 
    expiresAt: Date 
  }) {

    const { userId, token, expiresAt } = params;

    return prisma.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.REFRESH,
      },
    });
  }

  async createResetToken(params: {
    userId: string;
    token: string;
    expiresAt: Date;
  }) {

    const { userId, token, expiresAt } = params;

    return prisma.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.RESET_PASSWORD,
      },
    });

  }

  async findActiveRefreshToken(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        token,
        type: TokenType.REFRESH,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  

async findActiveResetToken(token: string): Promise<Token | null> {

  return prisma.token.findFirst({
    where: {
      token,
      type: TokenType.RESET_PASSWORD,
      consumedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

  async consumeToken(id: string) {

    return prisma.token.update({
      where: {
        id,
      },
      data: {
        consumedAt: new Date(),
      },
    });

  }


  async revokeToken(id: string) {

    return prisma.token.update({
      where: {
        id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

  }

}