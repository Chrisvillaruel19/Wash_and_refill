import { prisma } from "../../lib/prisma.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const attendanceRepository = new AttendanceRepository();

// Admin-only escape hatch for the clock-in handoff rule: a Staff member who
// left without handing over and clocking out would otherwise block the next
// Staff member until the 16h auto-close. Skips the Shift Handover and
// unreported-activity gates on purpose — any unclaimed orders/expenses stay
// unclaimed and are picked up by the next handover (one shared drawer).
// Flagged autoClosed, same as the system sweep, so it stays visible to Admin
// for payroll; the audit log records that Admin, not the system, closed it.
export async function forceClockOutService(adminId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await attendanceRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.timeOut) return { alreadyClockedOut: true } as const;
      if (!existing.timeIn) return { noTimeIn: true } as const;

      const now = new Date();
      const hours = (now.getTime() - existing.timeIn.getTime()) / (1000 * 60 * 60);
      const totalHours = Math.round(hours * 10) / 10;

      const updated = await attendanceRepository.closeSession(
        id,
        { timeOut: now, totalHours, autoClosed: true },
        tx
      );

      await writeAuditLog(tx, {
        userId: adminId,
        action: AuditAction.UPDATE,
        module: "Attendance",
        description: "Admin force clocked out a staff member's open shift",
        oldValue: { attendanceId: id, staffUserId: existing.userId, timeOut: null },
        newValue: { timeOut: now, totalHours, autoClosed: true },
      });

      return { attendance: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Attendance record not found" };
    }
    if ("alreadyClockedOut" in result) {
      return { code: 400, status: "error", message: "This attendance record is already clocked out" };
    }
    if ("noTimeIn" in result) {
      return { code: 400, status: "error", message: "This attendance record has no clock-in time to measure from" };
    }

    return {
      code: 200,
      status: "success",
      message: "Staff member clocked out",
      data: { attendance: result.attendance },
    };
  } catch (error) {
    console.error("forceClockOutService error", error);
    return { code: 500, status: "error", message: "Unable to force clock out" };
  }
}
