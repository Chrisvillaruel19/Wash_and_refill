import { prisma } from "../../lib/prisma.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { getUnreportedActivity } from "../shift-handover/reconciliation.util.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const tokenRepository = new TokenRepository();
const attendanceRepository = new AttendanceRepository();
const shiftHandoverRepository = new ShiftHandoverRepository();

export async function LogoutService(refreshToken: string) {

  try {

    // A missing refresh token (no cookie, no body field) is not a token
    // lookup failure — it must never reach hashToken/findActiveRefreshToken
    // (crypto.createHash().update(undefined) throws) and instead fails the
    // same clean way an invalid-but-present token already does below.
    if (!refreshToken) {
      return {
        code: 401,
        status: "error",
        message: "Invalid refresh token"
      };
    }

    const token = await tokenRepository.findActiveRefreshToken(refreshToken);

    if (!token) {
      return {
        code: 401,
        status: "error",
        message: "Invalid refresh token"
      };
    }

    // Server-authoritative: Logout is not just a token teardown for a Staff
    // member with an open shift — it also has to close it out, and it must
    // never be usable to bypass Clock Out's own unreported-activity rule.
    // Reuses the exact same check (getUnreportedActivity) and the exact
    // same session-closing math clockOutService itself uses — the business
    // logic lives in exactly one place; this composes it, rather than
    // calling clockOutService as a black box, so the check, the close, and
    // the token revocation all commit as one atomic unit (no window where
    // attendance is closed but the session is still technically valid, or
    // vice versa). Accounts with no active attendance record (Admin, or a
    // Staff member who already clocked out manually) skip straight to the
    // token revocation below, unchanged from today.
    const result = await prisma.$transaction(async (tx) => {
      const activeAttendance = await attendanceRepository.findActiveForUser(token.userId, tx);

      if (activeAttendance && activeAttendance.timeIn) {
        // Check 1 of 2, and checked first: has this staff member formally
        // submitted at least one Shift Handover during the CURRENT shift
        // (since this attendance session's own timeIn)? A handover from a
        // prior shift, or from another staff member, never satisfies this
        // — every shift must be its own formal handover, independent of
        // whether any orders/expenses happen to be outstanding right now.
        const handedOverThisShift = await shiftHandoverRepository.existsForUserSince(
          token.userId,
          activeAttendance.timeIn,
          tx
        );
        if (!handedOverThisShift) {
          return { shiftHandoverRequired: true } as const;
        }

        // Check 2 of 2: the existing, unmodified financial-reconciliation
        // gate — money that became unclaimed AFTER the shift's own handover
        // was submitted (e.g. a new paid order created afterward) still
        // blocks, exactly as before.
        const { orders, expenses } = await getUnreportedActivity(token.userId, tx);
        if (orders.length > 0 || expenses.length > 0) {
          return { unreportedActivity: true } as const;
        }

        const now = new Date();
        const hours = (now.getTime() - activeAttendance.timeIn.getTime()) / (1000 * 60 * 60);
        const totalHours = Math.round(hours * 10) / 10;

        await attendanceRepository.closeSession(
          activeAttendance.id,
          { timeOut: now, totalHours, autoClosed: false },
          tx
        );

        await writeAuditLog(tx, {
          userId: token.userId,
          action: AuditAction.UPDATE,
          module: "Attendance",
          description: "Clocked out (automatic, on logout)",
          newValue: { timeOut: now, totalHours },
        });
      }

      await tokenRepository.revokeToken(token.id, tx);

      return { loggedOut: true } as const;
    });

    if ("shiftHandoverRequired" in result) {
      // Nothing was written above — the transaction returned before the
      // revoke, so the refresh token is still valid and the Staff member
      // is still logged in, exactly as required. Message text matches the
      // frontend's "Shift Handover Required" modal verbatim, and is
      // deliberately distinct from the unreportedActivity message below so
      // the frontend can tell the two cases apart.
      return {
        code: 409,
        status: "error",
        message: "Please complete and submit your Shift Handover before logging out.",
      };
    }

    if ("unreportedActivity" in result) {
      // Nothing was written above — the transaction returned before the
      // revoke, so the refresh token is still valid and the Staff member
      // is still logged in, exactly as required.
      return {
        code: 409,
        status: "error",
        message: "You have unreported activity. Please submit a Shift Handover before logging out.",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Logout successful"
    };


  } catch (error) {

    console.error("LogoutService error:", error);

    return {
      code: 500,
      status: "error",
      message: "Unable to logout"
    };

  }

}
