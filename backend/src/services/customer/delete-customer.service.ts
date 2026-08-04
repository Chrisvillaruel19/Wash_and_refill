import { CustomerRepository } from "../../repositories/customer.repository.js";
import { isForeignKeyRestrictError } from "../../lib/prisma-errors.js";

const customerRepository = new CustomerRepository();

export async function deleteCustomerService(id: string) {
  try {
    const existing = await customerRepository.findById(id);

    if (!existing) {
      return {
        code: 404,
        status: "error",
        message: "Customer not found",
      };
    }

    await customerRepository.delete(id);

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
