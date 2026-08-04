import { prisma } from "../../lib/prisma.js";
import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";
import { ItemType, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const laundryServiceRepository = new LaundryServiceRepository();

export async function updateLaundryServiceService(
  userId: string,
  id: string,
  updates: Partial<{ serviceName: string; itemType: ItemType; price: number }>
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await laundryServiceRepository.findById(id, tx);
      if (!existing || !existing.status) return null;

      const updated = await laundryServiceRepository.update(id, updates, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "LaundryService",
        description: `Updated laundry service "${updated.serviceName}"`,
        oldValue: { serviceName: existing.serviceName, itemType: existing.itemType, price: Number(existing.price) },
        newValue: { serviceName: updated.serviceName, itemType: updated.itemType, price: Number(updated.price) },
      });

      return updated;
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
      message: "Laundry service updated successfully",
      data: { service: result },
    };
  } catch (error) {
    console.error("updateLaundryServiceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update laundry service",
    };
  }
}
