import { UserRepository } from "../../repositories/user.repository.js";
import { AccountStatus, Prisma } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();

export type EmployeeListStatus = "active" | "inactive" | "archived";

// Each status maps 1:1 onto the enum. No status = the Employee page's "All"
// tab: everyone still on the roster (ACTIVE + INACTIVE). ARCHIVED accounts
// are deliberately excluded — they only appear on the Archive page.
function toStatusFilter(status?: EmployeeListStatus): Prisma.UserWhereInput["accountStatus"] {
  if (status === "active") return AccountStatus.ACTIVE;
  if (status === "inactive") return AccountStatus.INACTIVE;
  if (status === "archived") return AccountStatus.ARCHIVED;
  return { not: AccountStatus.ARCHIVED };
}

export async function listEmployeesService(status?: EmployeeListStatus) {
  try {
    const employees = await userRepository.findAllStaff(toStatusFilter(status));

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
