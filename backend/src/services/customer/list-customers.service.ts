import { CustomerRepository } from "../../repositories/customer.repository.js";

const customerRepository = new CustomerRepository();

export async function listCustomersService() {
  try {
    const customers = await customerRepository.findAll();

    return {
      code: 200,
      status: "success",
      message: "Customers retrieved successfully",
      data: { customers },
    };
  } catch (error) {
    console.error("listCustomersService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve customers",
    };
  }
}
