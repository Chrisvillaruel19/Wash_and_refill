import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";
import { AuditAction, Prisma } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { sendEmailVerification } from "../auth/email-verification.service.js";

const tokenRepository = new TokenRepository();

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

      // Same email check as Create Employee (case-insensitive, excluding this
      // employee). Without it the unique constraint surfaced as a 500.
      if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
        const emailTaken = await userRepository.findByEmailInsensitive(updates.email, tx);
        if (emailTaken && emailTaken.id !== existing.id) return { emailTaken: true } as const;
      }

      const { password, ...fieldUpdates } = updates;
      const updated = await userRepository.updateEmployee(
        id,
        { ...fieldUpdates, ...(password ? { password: hashPassword(password) } : {}) },
        tx
      );

      // A new address is unproven: clear verification and kill any link
      // still outstanding for the old one, in the same transaction as the
      // change. Other edits leave verification untouched.
      const emailChanged = !!updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase();
      if (emailChanged) {
        await userRepository.setEmailVerifiedAt(id, null, tx);
        await tokenRepository.revokeOutstandingEmailVerificationTokens(id, tx);
      }

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

      return { employee: updated, emailChanged } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Employee not found" };
    }
    if ("usernameTaken" in result) {
      return { code: 409, status: "error", message: "Username already registered" };
    }
    if ("emailTaken" in result) {
      return { code: 409, status: "error", message: "Email already registered" };
    }

    // Sent after the transaction commits, to the new address only.
    const verificationEmailSent = result.emailChanged ? (await sendEmailVerification(id)).sent : undefined;

    return {
      code: 200,
      status: "success",
      message:
        verificationEmailSent === false
          ? "Employee updated, but the verification email to the new address could not be sent. Use \"Send verification link\" to try again."
          : result.emailChanged
            ? "Employee updated. A verification link was sent to the new email address."
            : "Employee updated successfully",
      data: { employee: result.employee, verificationEmailSent },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { code: 409, status: "error", message: "Username or email already registered" };
    }
    console.error("updateEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update employee",
    };
  }
}
