import { prisma } from "../../lib/prisma.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const packageRepository = new PackageRepository();

// No RESTORE value exists in AuditAction (only ARCHIVE) — recorded as
// UPDATE with an explicit description, same convention restoreEmployeeService
// already uses for an action the enum doesn't have a dedicated slot for.
export async function restorePackageService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await packageRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;
      if (existing.status) return { alreadyActive: true } as const;

      const updated = await packageRepository.restore(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "Package",
        description: `Restored package "${updated.packageName}"`,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
      });

      return { package: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Package not found" };
    }
    if ("alreadyActive" in result) {
      return { code: 400, status: "error", message: "Package is already active" };
    }

    return {
      code: 200,
      status: "success",
      message: "Package restored successfully",
      data: { package: result.package },
    };
  } catch (error) {
    console.error("restorePackageService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to restore package",
    };
  }
}
