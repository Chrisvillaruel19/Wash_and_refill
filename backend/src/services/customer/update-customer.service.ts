import { CustomerRepository } from "../../repositories/customer.repository.js";

const customerRepository = new CustomerRepository();

// phoneNumber is deliberately not editable here — it's the dedupe key
// find-or-create relies on; allowing it to change would reopen the
// duplicate-customer problem it exists to prevent.
export async function updateCustomerService(id: string, customerName: string) {
  try {
    const existing = await customerRepository.findById(id);

    if (!existing) {
      return {
        code: 404,
        status: "error",
        message: "Customer not found",
      };
    }

    const updated = await customerRepository.updateName(id, customerName);

    return {
      code: 200,
      status: "success",
      message: "Customer updated successfully",
      data: { customer: updated },
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
