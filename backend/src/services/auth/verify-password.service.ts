import { UserRepository } from "../../repositories/user.repository.js";
import { verifyPassword } from "../../utils/password.js";
import { Role } from "../../../generated/prisma/client.js";

const userRepository = new UserRepository();

// Manager-override check (e.g. Staff Inventory's restock re-auth) — confirms
// a password belongs to an active Admin account, nothing more. Deliberately
// NOT LoginService: that issues tokens and sets the refreshToken cookie as a
// side effect, which would silently replace the caller's own session cookie
// with the checked account's — a privilege-escalation bug, not a fix, for a
// flow that must never change who is actually logged in. This function only
// ever returns a yes/no answer.
export async function verifyPasswordService(username: string, password: string) {
  try {
    const user = await userRepository.findByUsername(username);

    if (!user || !verifyPassword(password, user.password) || user.accountStatus !== "ACTIVE") {
      return {
        code: 401,
        status: "error",
        message: "Invalid username or password",
      };
    }

    if (user.role !== Role.ADMIN) {
      return {
        code: 403,
        status: "error",
        message: "Only an Admin account can authorize this action",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Authorized",
      data: { authorized: true },
    };
  } catch (error) {
    console.error("verifyPasswordService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to verify credentials",
    };
  }
}
