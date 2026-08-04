import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";

const laundryServiceRepository = new LaundryServiceRepository();

export async function listLaundryServicesService() {
  try {
    const services = await laundryServiceRepository.findAllActive();

    return {
      code: 200,
      status: "success",
      message: "Laundry services retrieved successfully",
      data: { services },
    };
  } catch (error) {
    console.error("listLaundryServicesService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve laundry services",
    };
  }
}
