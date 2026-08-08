import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "../lib/jwt.js";
import { Role } from "../../generated/prisma/client.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

// Must run after AuthMiddleware.execute, which populates req.user from a
// verified access token (including its role claim).
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.role || !roles.includes(authReq.user.role)) {
      return res.status(403).json({
        code: 403,
        status: "error",
        message: "Insufficient permissions",
      });
    }

    return next();
  };
}
