import { UserRepository } from "../../repositories/user.repository.js";
import { AccountStatus } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();

// No status = preserve the original "everyone" behavior (used by the
// Employee page's own "All" tab). "active"/"archived" map directly onto
// the enum; AccountStatus.INACTIVE stays unused/reserved, same as elsewhere.
function toAccountStatus(status?: "active" | "archived"): AccountStatus | undefined {
  if (status === "active") return AccountStatus.ACTIVE;
  if (status === "archived") return AccountStatus.ARCHIVED;
  return undefined;
}

export async function listEmployeesService(status?: "active" | "archived") {
  try {
    const employees = await userRepository.findAllStaff(toAccountStatus(status));

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
