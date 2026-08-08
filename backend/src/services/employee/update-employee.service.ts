import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const userRepository = new UserRepository();

export async function updateEmployeeService(
  actorUserId: string,
  id: string,
  updates: {
    username?: string;
    name?: string;
    email?: string;
    phone?: string;
    hiredDate?: Date;
    password?: string;
  }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await userRepository.findByIdForEmployee(id, tx);
      if (!existing) return { notFound: true } as const;

      if (updates.username && updates.username !== existing.username) {
        const usernameTaken = await userRepository.findByUsername(updates.username, tx);
        if (usernameTaken) return { usernameTaken: true } as const;
      }

      const { password, ...fieldUpdates } = updates;
      const updated = await userRepository.updateEmployee(
        id,
        { ...fieldUpdates, ...(password ? { password: hashPassword(password) } : {}) },
        tx
      );

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.UPDATE,
        module: "Employee",
        description: `Updated employee: ${updated.name}`,
        oldValue: {
          username: existing.username,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
        },
        newValue: {
          username: updated.username,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        },
      });

      return { employee: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Employee not found" };
    }
    if ("usernameTaken" in result) {
      return { code: 409, status: "error", message: "Username already registered" };
    }

    return {
      code: 200,
      status: "success",
      message: "Employee updated successfully",
      data: { employee: result.employee },
    };
  } catch (error) {
    console.error("updateEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update employee",
    };
  }
}
