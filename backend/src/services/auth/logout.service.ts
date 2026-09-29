import { prisma } from "../../lib/prisma.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { getUnreportedActivity } from "../shift-handover/reconciliation.util.js";

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

    // Server-authoritative: a Staff member with an open shift cannot log
    // out at all — they must submit their Shift Handover and then Clock Out
    // themselves (Clock Out enforces the same handover/unreported checks).
    // Logout never closes the shift on their behalf. The two checks below
    // run first only so the error names the earliest step still missing.
    // Accounts with no active attendance record (Admin, or a Staff member
    // who already clocked out) skip straight to the token revocation below.
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

        // Handover is done — the only step left is clocking out.
        return { clockOutRequired: true } as const;
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

    if ("clockOutRequired" in result) {
      // Nothing was written — still logged in, shift still open. Message
      // text is matched by the frontend ("clock out") to pick its modal.
      return {
        code: 409,
        status: "error",
        message: "Please clock out on the Attendance page before logging out.",
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
