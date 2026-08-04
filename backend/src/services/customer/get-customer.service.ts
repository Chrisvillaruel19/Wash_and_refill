import { CustomerRepository } from "../../repositories/customer.repository.js";

const customerRepository = new CustomerRepository();

export async function getCustomerService(id: string) {
  try {
    const customer = await customerRepository.findById(id);

    if (!customer) {
      return {
        code: 404,
        status: "error",
        message: "Customer not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Customer retrieved successfully",
      data: { customer },
    };
  } catch (error) {
    console.error("getCustomerService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve customer",
    };
  }
}
