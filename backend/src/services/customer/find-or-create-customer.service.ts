import { CustomerRepository } from "../../repositories/customer.repository.js";
import { Prisma } from "../../../generated/prisma/client.js";

const customerRepository = new CustomerRepository();

// Attempts the create directly rather than "check if exists, then create" —
// the latter has a real race window between two simultaneous requests for
// the same phone number. Creating first and catching the unique-constraint
// violation (P2002) on conflict is atomic and race-safe without needing an
// explicit transaction for what's still a single-table write.
export async function findOrCreateCustomerService(data: {
  customerName: string;
  phoneNumber: string;
}) {
  try {
    const created = await customerRepository.create(data);

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
