import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { AccountStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();
const attendanceRepository = new AttendanceRepository();
const tokenRepository = new TokenRepository();

// ACTIVE -> INACTIVE. An inactive account stays on the Employee page (under
// the "Inactive" tab) but can no longer log in — login/refresh/forgot-password
// all require accountStatus === ACTIVE. Only INACTIVE accounts can then be
// archived (see archive-employee.service.ts).
export async function deactivateEmployeeService(actorUserId: string, id: string) {
  try {
    if (actorUserId === id) {
      return { code: 400, status: "error", message: "You cannot deactivate your own account" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await userRepository.findByIdForEmployee(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.accountStatus !== AccountStatus.ACTIVE) {
        return { notActive: true } as const;
      }

      // Same reasoning as archive: a deactivated account can't log in to
      // hand over and clock out, and its open shift would block other Staff.
      const openShift = await attendanceRepository.findActiveForUser(id, tx);
      if (openShift) return { clockedIn: true } as const;

      const updated = await userRepository.setAccountStatus(id, AccountStatus.INACTIVE, tx);
      // End every session now: none of their refresh tokens can be used
      // again, even if the account is later restored (they log in fresh).
      await tokenRepository.revokeAllActiveRefreshTokensForUser(id, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.UPDATE,
        module: "Employee",
        description: `Deactivated employee: ${updated.name}`,
        oldValue: { accountStatus: existing.accountStatus },
        newValue: { accountStatus: updated.accountStatus },
      });

      return { employee: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Employee not found" };
    }
    if ("notActive" in result) {
      return { code: 400, status: "error", message: "Only active employees can be deactivated" };
    }
    if ("clockedIn" in result) {
      return {
        code: 409,
        status: "error",
        message: "This employee is currently clocked in. They must clock out (or be force clocked out on the Attendance page) before they can be deactivated.",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Employee deactivated successfully",
      data: { employee: result.employee },
    };
  } catch (error) {
    console.error("deactivateEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to deactivate employee",
    };
  }
}
