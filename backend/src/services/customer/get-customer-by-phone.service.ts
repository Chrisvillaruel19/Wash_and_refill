import { CustomerRepository } from "../../repositories/customer.repository.js";

const customerRepository = new CustomerRepository();

export async function getCustomerByPhoneService(phoneNumber: string) {
  try {
    const customer = await customerRepository.findByPhone(phoneNumber);

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
    console.error("getCustomerByPhoneService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve customer",
    };
  }
}
