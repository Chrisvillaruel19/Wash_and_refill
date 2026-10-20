import { NextFunction, Request, Response } from "express";
import { verifyAccessToken, JwtPayload } from "../lib/jwt.js";
import { UserRepository } from "../repositories/user.repository.js";
import { AccountStatus } from "../../generated/prisma/client.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

const userRepository = new UserRepository();

export class AuthMiddleware {
  public execute = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    // 1. Try to get token from Authorization Header
    let accessToken = this.extractBearerToken(req.headers.authorization);

    // 2. Fallback to Cookies (for Web applications)
    if (!accessToken && req.cookies) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      return res.status(401).json({ code: 401, status: "error", message: "Authentication required" });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return res.status(401).json({ code: 401, status: "error", message: "Invalid or expired token" });
    }

    // The token alone isn't enough: an account deactivated or archived after
    // the token was issued must lose access right away, not when the token
    // expires. Role also comes from the database, never from the token.
    try {
      const user = await userRepository.findById(payload.sub);
      if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
        return res.status(401).json({ code: 401, status: "error", message: "Invalid or expired token" });
      }
      authReq.user = { ...payload, role: user.role };
    } catch (error) {
      console.error("AuthMiddleware error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to verify your session" });
    }
    return next();
  };

  private extractBearerToken(header?: string) {
    if (!header) return undefined;
    const [scheme, token] = header.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return undefined;
    return token.trim();
  }
}