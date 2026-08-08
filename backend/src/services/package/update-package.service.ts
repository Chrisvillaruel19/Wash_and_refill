import { prisma } from "../../lib/prisma.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { validatePackageDetails } from "./validate-package-details.util.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const packageRepository = new PackageRepository();

export async function updatePackageService(
  userId: string,
  id: string,
  updates: {
    packageName?: string;
    price?: number;
    color?: string;
    details?: { inventoryId: string; quantity: number }[];
  }
) {
  try {
    if (updates.details) {
      const validationError = await validatePackageDetails(updates.details);
      if (validationError) {
        return { code: 400, status: "error", message: validationError };
      }
    }

    const { details, ...fieldUpdates } = updates;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await packageRepository.findById(id, tx);
      if (!existing || !existing.status) return null;

      if (Object.keys(fieldUpdates).length > 0) {
        await packageRepository.update(id, fieldUpdates, tx);
      }
      if (details) {
        await packageRepository.replaceDetails(id, details, tx);
      }

      const result = await packageRepository.findById(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "Package",
        description: `Updated package "${existing.packageName}"`,
        oldValue: { packageName: existing.packageName, price: Number(existing.price), color: existing.color },
        newValue: { packageName: result?.packageName, price: Number(result?.price), color: result?.color },
      });

      return result;
    });

    if (!updated) {
      return {
        code: 404,
        status: "error",
        message: "Package not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Package updated successfully",
      data: { package: updated },
    };
  } catch (error) {
    console.error("updatePackageService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update package",
    };
  }
}
