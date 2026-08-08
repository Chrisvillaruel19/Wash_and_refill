import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();

export async function createEmployeeService(
  actorUserId: string,
  username: string,
  email: string,
  name: string,
  password: string,
  phone?: string,
  hiredDate?: Date
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await userRepository.findByUsername(username, tx);
      if (existing) return null;

      const created = await userRepository.create(
        { username, email, name, phone, hiredDate, password: hashPassword(password) },
        tx
      );

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.CREATE,
        module: "Employee",
        description: `Added a new employee: ${created.name}`,
        newValue: { username: created.username, email, name: created.name, role: created.role },
      });

      return created;
    });

    if (!result) {
      return {
        code: 409,
        status: "error",
        message: "Username already registered",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Created account successfully",
      data: { user: result },
    };
  } catch (error) {
    console.error("createEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create account",
    };
  }
}
