import { prisma } from "../../lib/prisma.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";
import { AuditAction, Prisma } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { sendEmailVerification } from "../auth/email-verification.service.js";

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

      // Case-insensitive, matching Forgot Password's lookup — "Juan@Gmail.com"
      // and "juan@gmail.com" are the same mailbox.
      const existingEmail = await userRepository.findByEmailInsensitive(email, tx);
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

    // New accounts start unverified; the link proves the address belongs to
    // the employee. A failed send doesn't undo the account — the Admin can
    // resend from Employee Management — and never marks the email verified.
    const verification = await sendEmailVerification(result.id);
    const verificationEmailSent = verification.sent;

    return {
      code: 201,
      status: "success",
      message: verificationEmailSent
        ? "Created account successfully. A verification link was sent to the employee's email."
        : "Created account successfully, but the verification email could not be sent. Use \"Send verification link\" to try again.",
      data: { user: result, verificationEmailSent },
    };
  } catch (error) {
    // Two simultaneous creates can both pass the checks above; the unique
    // constraint then rejects the second — report it as the conflict it is.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { code: 409, status: "error", message: "Username or email already registered" };
    }
    console.error("createEmployeeService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create account",
    };
  }
}
