import { prisma } from "../../lib/prisma.js";
import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const laundryServiceRepository = new LaundryServiceRepository();

export async function deleteLaundryServiceService(userId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await laundryServiceRepository.findById(id, tx);
      if (!existing || !existing.status) return null;

      // Soft delete only — OrderDetail.serviceId is onDelete: SET NULL, so a
      // hard delete would silently lose the link on any historical order that
      // used this service. Same pattern as Inventory's isActive.
      await laundryServiceRepository.softDelete(id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.DELETE,
        module: "LaundryService",
        description: `Removed laundry service "${existing.serviceName}"`,
        oldValue: { serviceName: existing.serviceName },
      });

      return true;
    });

    if (!result) {
      return {
        code: 404,
        status: "error",
        message: "Laundry service not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Laundry service removed successfully",
    };
  } catch (error) {
    console.error("deleteLaundryServiceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to remove laundry service",
    };
  }
}
