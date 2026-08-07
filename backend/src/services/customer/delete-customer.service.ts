import { prisma } from "../../lib/prisma.js";
import { CustomerRepository } from "../../repositories/customer.repository.js";
import { isForeignKeyRestrictError } from "../../lib/prisma-errors.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const customerRepository = new CustomerRepository();

export async function deleteCustomerService(actorUserId: string, id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await customerRepository.findById(id, tx);
      if (!existing) return null;

      await customerRepository.delete(id, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.DELETE,
        module: "Customer",
        description: `Removed customer "${existing.customerName}"`,
        oldValue: { customerName: existing.customerName, phoneNumber: existing.phoneNumber },
      });

      return true;
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
      message: "Customer removed successfully",
    };
  } catch (error) {
    // Order.customerId is onDelete: RESTRICT — the database itself blocks
    // deleting a customer with real order history. Surface that as a clear
    // 409, not a generic 500.
    if (isForeignKeyRestrictError(error)) {
      return {
        code: 409,
        status: "error",
        message: "Cannot remove a customer with existing order history",
      };
    }

    console.error("deleteCustomerService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to remove customer",
    };
  }
}
