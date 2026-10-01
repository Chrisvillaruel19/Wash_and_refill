import { prisma } from "../../lib/prisma.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { Prisma, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { getBusinessDateOnly } from "../../lib/business-timezone.js";
import { computeClockInStatus } from "./shift-schedule.util.js";
import { sweepStaleAttendance } from "./auto-close.util.js";

const attendanceRepository = new AttendanceRepository();

export async function clockInService(userId: string) {
  try {
    // Close any forgotten (16h+) session first, so a stale record the lazy
    // sweep simply hasn't reached yet can't block the next Staff member.
    await sweepStaleAttendance();

    const result = await prisma.$transaction(async (tx) => {
      // Serializes clock-ins: without it, two Staff clocking in at the same
      // moment could both see "nobody on duty" and both be let in.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('attendance-clock-in'))`;

      // A session of their own left open from a previous day — the
      // (userId, date) unique constraint alone wouldn't stop a second one.
      const ownOpen = await attendanceRepository.findActiveForUser(userId, tx);
      if (ownOpen) return { ownSessionOpen: true } as const;

      const now = new Date();
      // Date-only, matching the column's @db.Date type and the
      // @@unique([userId, date]) constraint this relies on. Computed in the
      // business's own timezone (see business-timezone.ts), not the server
      // process's ambient local time.
      const today = getBusinessDateOnly(now);

      // Their own shift for today is already done — checked before the
      // handoff rule below, since it's the reason that applies to them no
      // matter who else is on duty.
      const todaysRecord = await attendanceRepository.findForUserOnDate(userId, today, tx);
      if (todaysRecord) return { alreadyClockedInToday: true } as const;

      // Handoff rule: the next Staff member can't clock in until the
      // current one has clocked out (which itself requires their Shift
      // Handover). Admin can force-close a stuck session to unblock this.
      const onDuty = await attendanceRepository.findOpenStaffSessionForOtherUser(userId, tx);
      if (onDuty) return { otherStaffOnDuty: onDuty.user.name } as const;

      const record = await attendanceRepository.create(
        { userId, date: today, timeIn: now, status: computeClockInStatus(now) },
        tx
      );

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "Attendance",
        description: record.status === "LATE" ? "Clocked in (late)" : "Clocked in",
        newValue: { date: today, timeIn: now, status: record.status },
      });

      return { attendance: record } as const;
    });

    if ("ownSessionOpen" in result) {
      return {
        code: 409,
        status: "error",
        message: "You are already clocked in. Please clock out of your current shift first.",
      };
    }
    if ("alreadyClockedInToday" in result) {
      return {
        code: 409,
        status: "error",
        message: "You have already clocked in today. Only one shift per day is allowed.",
      };
    }
    if ("otherStaffOnDuty" in result) {
      return {
        code: 409,
        status: "error",
        message: `${result.otherStaffOnDuty} has not clocked out yet. You can clock in once their shift is closed.`,
      };
    }

    return {
      code: 201,
      status: "success",
      message: "Clocked in successfully",
      data: { attendance: result.attendance },
    };
  } catch (error) {
    // Unique-constraint violation on (userId, date) — this is a CREATE-time
    // engine-level error, which does surface as the classic
    // PrismaClientKnownRequestError shape (verified in Customer/Orders;
    // unlike the driver-adapter RESTRICT-on-delete error shape).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        code: 409,
        status: "error",
        message: "Already clocked in today",
      };
    }

    console.error("clockInService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to clock in",
    };
  }
}
