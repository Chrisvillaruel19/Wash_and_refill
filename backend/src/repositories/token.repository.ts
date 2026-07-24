import { prisma } from "@/lib/prisma";
import { TokenType } from "@/generated/prisma/client";

export class TokenRepository {

  async createRefreshToken(params:{
    userId:string;
    token:string;
    expiresAt:Date;
  }) {

    return await prisma.token.create({
      data:{
        userId: params.userId,
        token: params.token,
        expiresAt: params.expiresAt,
        type: TokenType.REFRESH,
      }
    });

  }


  async findRefreshToken(token:string){

    return await prisma.token.findFirst({
      where:{
        token,
        type: TokenType.REFRESH,
      }
    });

  }


  async deleteToken(token:string){

    return await prisma.token.delete({
      where:{
        token,
      }
    });

  }

}