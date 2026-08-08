import { prisma } from "../../lib/prisma.js";
import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";
import { ItemType, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const laundryServiceRepository = new LaundryServiceRepository();

export async function createLaundryServiceService(
  userId: string,
  data: { serviceName: string; itemType: ItemType; price: number }
) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const service = await laundryServiceRepository.create(data, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "LaundryService",
        description: `Created laundry service "${service.serviceName}"`,
        newValue: { serviceName: service.serviceName, itemType: service.itemType, price: Number(service.price) },
      });

      return service;
    });

    return {
      code: 201,
      status: "success",
      message: "Laundry service created successfully",
      data: { service: created },
    };
  } catch (error) {
    console.error("createLaundryServiceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create laundry service",
    };
  }
}
