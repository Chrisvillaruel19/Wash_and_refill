import { prisma } from "../../lib/prisma.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const packageRepository = new PackageRepository();

export async function deletePackageService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await packageRepository.findById(id, tx);
      if (!existing || !existing.status) return null;

      // Soft delete only — OrderDetail.packageId is onDelete: SET NULL, so a
      // hard delete would silently lose the link on any historical order that
      // used this package. PackageDetail rows are left as-is (only visible
      // through the deactivated package).
      await packageRepository.softDelete(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.DELETE,
        module: "Package",
        description: `Removed package "${existing.packageName}"`,
        oldValue: { packageName: existing.packageName },
      });

      return true;
    });

    if (!result) {
      return {
        code: 404,
        status: "error",
        message: "Package not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Package removed successfully",
    };
  } catch (error) {
    console.error("deletePackageService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to remove package",
    };
  }
}
