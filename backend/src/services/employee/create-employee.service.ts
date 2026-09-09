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
      const existingUsername = await userRepository.findByUsername(username, tx);
      if (existingUsername) return { conflict: "username" } as const;

      const existingEmail = await userRepository.findByEmail(email, tx);
      if (existingEmail) return { conflict: "email" } as const;

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

    if ("conflict" in result) {
      return {
        code: 409,
        status: "error",
        message: result.conflict === "username" ? "Username already registered" : "Email already registered",
      };
    }

    return {
      code: 201,
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
