import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AccountStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();

// No RESTORE value exists in AuditAction (only ARCHIVE) — recorded as
// UPDATE with an explicit description, same convention Order cancellation
// already uses for an action the enum doesn't have a dedicated slot for.
export async function restoreEmployeeService(actorUserId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await userRepository.findByIdForEmployee(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.accountStatus === AccountStatus.ACTIVE) {
        return { alreadyActive: true } as const;
      }

      const updated = await userRepository.setAccountStatus(id, AccountStatus.ACTIVE, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.UPDATE,
        module: "Employee",
        description: `Restored employee: ${updated.name}`,
        oldValue: { accountStatus: existing.accountStatus },
        newValue: { accountStatus: updated.accountStatus },
      });

      return { employee: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Employee not found" };
    }
    if ("alreadyActive" in result) {
      return { code: 400, status: "error", message: "Employee is already active" };
    }

    return {
      code: 200,
      status: "success",
      message: "Employee restored successfully",
      data: { employee: result.employee },
    };
  } catch (error) {
    console.error("restoreEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to restore employee",
    };
  }
}
