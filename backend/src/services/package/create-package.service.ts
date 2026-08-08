import { prisma } from "../../lib/prisma.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { validatePackageDetails } from "./validate-package-details.util.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const packageRepository = new PackageRepository();

export async function createPackageService(
  userId: string,
  data: {
    packageName: string;
    price: number;
    color?: string;
    details: { inventoryId: string; quantity: number }[];
  }
) {
  try {
    const validationError = await validatePackageDetails(data.details);
    if (validationError) {
      return { code: 400, status: "error", message: validationError };
    }

    // Package + its PackageDetail rows must succeed or fail together —
    // a partially-created recipe would be worse than no recipe at all.
    const created = await prisma.$transaction(async (tx) => {
      const pkg = await packageRepository.create(
        { packageName: data.packageName, price: data.price, color: data.color },
        tx
      );
      await packageRepository.replaceDetails(pkg.id, data.details, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "Package",
        description: `Created package "${pkg.packageName}"`,
        newValue: { packageName: pkg.packageName, price: Number(pkg.price), details: data.details },
      });

      return packageRepository.findById(pkg.id, tx);
    });

    return {
      code: 201,
      status: "success",
      message: "Package created successfully",
      data: { package: created },
    };
  } catch (error) {
    console.error("createPackageService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create package",
    };
  }
}
