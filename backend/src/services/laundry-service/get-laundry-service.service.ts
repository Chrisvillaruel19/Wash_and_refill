import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";

const laundryServiceRepository = new LaundryServiceRepository();

export async function getLaundryServiceService(id: string) {
  try {
    const service = await laundryServiceRepository.findById(id);

    if (!service) {
      return {
        code: 404,
        status: "error",
        message: "Laundry service not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Laundry service retrieved successfully",
      data: { service },
    };
  } catch (error) {
    console.error("getLaundryServiceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve laundry service",
    };
  }
}
