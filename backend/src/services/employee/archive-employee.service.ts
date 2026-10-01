import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { AuditLogRepository } from "../../repositories/audit-log.repository.js";
import { AccountStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();
const attendanceRepository = new AttendanceRepository();
const auditLogRepository = new AuditLogRepository();

// An account can only be archived after this long with no activity at all.
const INACTIVITY_DAYS_BEFORE_ARCHIVE = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" });
}

export async function archiveEmployeeService(actorUserId: string, id: string) {
  try {
    // An admin archiving their own account would lock themselves out with
    // no one able to undo it from the UI (Employee Management is Admin-only,
    // and login itself checks accountStatus === ACTIVE) — blocked outright,
    // not just discouraged.
    if (actorUserId === id) {
      return { code: 400, status: "error", message: "You cannot archive your own account" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await userRepository.findByIdForEmployee(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.accountStatus === AccountStatus.ARCHIVED) {
        return { alreadyArchived: true } as const;
      }

      // Never archive someone mid-shift: an archived account can't log in
      // to hand over and clock out, and their open shift would block every
      // other Staff member from logging in (see login.service.ts).
      const openShift = await attendanceRepository.findActiveForUser(id, tx);
      if (openShift) return { clockedIn: true } as const;

      // Only accounts inactive for INACTIVITY_DAYS_BEFORE_ARCHIVE may be
      // archived. "Activity" is the user's latest audit log entry (every
      // clock-in, order, expense, handover and admin action writes one);
      // an account that has never done anything counts from its creation.
      const latestLog = await auditLogRepository.findLatestForUser(id, tx);
      const created = await userRepository.findCreatedAt(id, tx);
      const lastActive = latestLog?.createdAt ?? created?.createdAt ?? new Date();
      const archivableFrom = new Date(lastActive.getTime() + INACTIVITY_DAYS_BEFORE_ARCHIVE * DAY_MS);
      if (Date.now() < archivableFrom.getTime()) {
        return {
          recentlyActive: `This employee was last active on ${formatDate(lastActive)}. Accounts can only be archived after ${INACTIVITY_DAYS_BEFORE_ARCHIVE} days of inactivity — available from ${formatDate(archivableFrom)}.`,
        } as const;
      }

      const updated = await userRepository.setAccountStatus(id, AccountStatus.ARCHIVED, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.ARCHIVE,
        module: "Employee",
        description: `Archived employee: ${updated.name}`,
        oldValue: { accountStatus: existing.accountStatus },
        newValue: { accountStatus: updated.accountStatus },
      });

      return { employee: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Employee not found" };
    }
    if ("alreadyArchived" in result) {
      return { code: 400, status: "error", message: "Employee is already archived" };
    }
    if ("clockedIn" in result) {
      return {
        code: 409,
        status: "error",
        message: "This employee is currently clocked in. They must clock out (or be force clocked out on the Attendance page) before they can be archived.",
      };
    }
    if ("recentlyActive" in result) {
      return { code: 409, status: "error", message: result.recentlyActive };
    }

    return {
      code: 200,
      status: "success",
      message: "Employee archived successfully",
      data: { employee: result.employee },
    };
  } catch (error) {
    console.error("archiveEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to archive employee",
    };
  }
}
