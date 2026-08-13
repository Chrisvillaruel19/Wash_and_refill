import { prisma } from "../../lib/prisma.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { getUnreportedActivity } from "../shift-handover/reconciliation.util.js";
import { AuditAction, Role } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const attendanceRepository = new AttendanceRepository();

// Ownership is enforced here, not just at the route/frontend layer: Staff
// may only clock out their own attendance record. Admin is exempt, matching
// the same Admin-sees/acts-on-everything pattern already used for Expense
// visibility (listExpensesService) elsewhere in this codebase — not a new
// RBAC concept, the existing one applied to this action.
export async function clockOutService(userId: string, role: Role | undefined, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await attendanceRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (existing.userId !== userId && role !== Role.ADMIN) {
        return { forbidden: true } as const;
      }

      if (existing.timeOut) {
        return { alreadyClockedOut: true } as const;
      }

      if (!existing.timeIn) {
        return { noTimeIn: true } as const;
      }

      // Cross-module business rule completed alongside Shift Handover
      // (approved exception to Attendance being otherwise frozen): a staff
      // member cannot clock out while orders or expenses from this shift
      // remain unreported.
      const { orders, expenses } = await getUnreportedActivity(existing.userId, tx);
      if (orders.length > 0 || expenses.length > 0) {
        return { unreportedActivity: true } as const;
      }

      const now = new Date();
      const hours = (now.getTime() - existing.timeIn.getTime()) / (1000 * 60 * 60);
      const totalHours = Math.round(hours * 10) / 10;

      const updated = await attendanceRepository.closeSession(
        id,
        { timeOut: now, totalHours, autoClosed: false },
        tx
      );

      await writeAuditLog(tx, {
        userId: existing.userId,
        action: AuditAction.UPDATE,
        module: "Attendance",
        description: "Clocked out",
        newValue: { timeOut: now, totalHours },
      });

      return { attendance: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Attendance record not found" };
    }
    if ("forbidden" in result) {
      return { code: 403, status: "error", message: "You can only clock out your own attendance record" };
    }
    if ("alreadyClockedOut" in result) {
      return { code: 400, status: "error", message: "This attendance record is already clocked out" };
    }
    if ("noTimeIn" in result) {
      return { code: 400, status: "error", message: "This attendance record has no clock-in time to measure from" };
    }
    if ("unreportedActivity" in result) {
      return {
        code: 409,
        status: "error",
        message: "You have unreported activity. Please submit a Shift Handover before clocking out.",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Clocked out successfully",
      data: { attendance: result.attendance },
    };
  } catch (error) {
    console.error("clockOutService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to clock out",
    };
  }
}
