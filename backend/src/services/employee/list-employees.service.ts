import { UserRepository } from "../../repositories/user.repository.js";

const userRepository = new UserRepository();

export async function listEmployeesService() {
  try {
    const employees = await userRepository.findAllStaff();

    return {
      code: 200,
      status: "success",
      message: "Employees retrieved successfully",
      data: { employees },
    };
  } catch (error) {
    console.error("listEmployeesService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve employees",
    };
  }
}
