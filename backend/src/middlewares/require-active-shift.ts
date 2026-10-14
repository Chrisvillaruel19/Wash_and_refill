import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "../lib/jwt.js";
import { Role } from "../../generated/prisma/client.js";
import { sweepStaleAttendance } from "../services/attendance/auto-close.util.js";
import { getActiveShiftBlock, NO_ACTIVE_SHIFT } from "../services/attendance/active-shift.util.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

// Must run after AuthMiddleware.execute. Put on every Staff-reachable route
// that records operational work (orders, expenses, restocks, customer
// edits) so a Staff member who has clocked out — or never clocked in, or
// already handed over — can't keep working, whether from a stale page or a
// direct API call. The identity is the verified token's, never anything the
// client sends, and the shift state is read fresh from the database on
// every request. Admins are governed by their own role checks, not by
// attendance, so they pass straight through.
export async function requireActiveShift(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user?.sub) {
    return res.status(401).json({ code: 401, status: "error", message: "Authentication required" });
  }
  if (user.role === Role.ADMIN) return next();

  try {
    // Same as the Attendance page: a session forgotten past the auto-close
    // limit is closed first, so it can't count as "still on shift".
    await sweepStaleAttendance();
    const block = await getActiveShiftBlock(user.sub);
    if (block) {
      return res.status(409).json({ code: 409, status: "error", message: block.message, reason: NO_ACTIVE_SHIFT });
    }
    return next();
  } catch (error) {
    console.error("requireActiveShift error", error);
    return res.status(500).json({ code: 500, status: "error", message: "Unable to verify your shift status" });
  }
}
