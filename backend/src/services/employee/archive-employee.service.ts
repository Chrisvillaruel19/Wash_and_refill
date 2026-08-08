import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AccountStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();

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
