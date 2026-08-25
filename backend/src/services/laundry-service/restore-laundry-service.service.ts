import { prisma } from "../../lib/prisma.js";
import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const laundryServiceRepository = new LaundryServiceRepository();

// No RESTORE value exists in AuditAction (only ARCHIVE) — recorded as
// UPDATE with an explicit description, same convention restoreEmployeeService
// already uses for an action the enum doesn't have a dedicated slot for.
export async function restoreLaundryServiceService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await laundryServiceRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.status) return { alreadyActive: true } as const;

      const updated = await laundryServiceRepository.restore(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "LaundryService",
        description: `Restored laundry service "${updated.serviceName}"`,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
      });

      return { service: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Laundry service not found" };
    }
    if ("alreadyActive" in result) {
      return { code: 400, status: "error", message: "Laundry service is already active" };
    }

    return {
      code: 200,
      status: "success",
      message: "Laundry service restored successfully",
      data: { service: result.service },
    };
  } catch (error) {
    console.error("restoreLaundryServiceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to restore laundry service",
    };
  }
}
