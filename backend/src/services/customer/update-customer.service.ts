import { prisma } from "../../lib/prisma.js";
import { CustomerRepository } from "../../repositories/customer.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const customerRepository = new CustomerRepository();

// phoneNumber is deliberately not editable here — it's the dedupe key
// find-or-create relies on; allowing it to change would reopen the
// duplicate-customer problem it exists to prevent.
export async function updateCustomerService(actorUserId: string, id: string, customerName: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await customerRepository.findById(id, tx);
      if (!existing) return null;

      const updated = await customerRepository.updateName(id, customerName, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.UPDATE,
        module: "Customer",
        description: `Renamed customer "${existing.customerName}" to "${updated.customerName}"`,
        oldValue: { customerName: existing.customerName },
        newValue: { customerName: updated.customerName },
      });

      return updated;
    });

    if (!result) {
      return {
        code: 404,
        status: "error",
        message: "Customer not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Customer updated successfully",
      data: { customer: result },
    };
  } catch (error) {
    console.error("updateCustomerService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update customer",
    };
  }
}
