import { prisma } from "../../lib/prisma.js";
import { CustomerRepository } from "../../repositories/customer.repository.js";
import { Prisma, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const customerRepository = new CustomerRepository();

// Attempts the create directly rather than "check if exists, then create" —
// the latter has a real race window between two simultaneous requests for
// the same phone number. Creating first and catching the unique-constraint
// violation (P2002) on conflict is race-safe regardless. The transaction
// below exists for a separate reason: pairing the create with its
// writeAuditLog call atomically, not for the race condition itself.
export async function findOrCreateCustomerService(
  actorUserId: string,
  data: {
    customerName: string;
    phoneNumber: string;
  }
) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const customer = await customerRepository.create(data, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.CREATE,
        module: "Customer",
        description: `Added a new customer: ${customer.customerName}`,
        newValue: { customerName: customer.customerName, phoneNumber: customer.phoneNumber },
      });

      return customer;
    });

    return {
      code: 201,
      status: "success",
      message: "Customer created successfully",
      data: { customer: created },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await customerRepository.findByPhone(data.phoneNumber);
      return {
        code: 200,
        status: "success",
        message: "Existing customer found",
        data: { customer: existing },
      };
    }

    console.error("findOrCreateCustomerService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create or find customer",
    };
  }
}
