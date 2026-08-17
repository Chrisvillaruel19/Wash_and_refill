import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";

const userRepository = new UserRepository();

// Called only by an Admin, about their own account (requireRole(ADMIN) on
// the route + the caller's own JWT `sub` is the identity — no separate
// re-authentication step, matching how the old restock-code generation
// trusted the Admin's own session). Reuses the exact same PBKDF2 hashing
// as login passwords; the PIN is never stored or logged in plaintext, and
// is never echoed back in the response.
export async function setRestockPinService(adminUserId: string, pin: string) {
  try {
    const restockPinHash = hashPassword(pin);
    await userRepository.setRestockPinHash(adminUserId, restockPinHash);

    return {
      code: 200,
      status: "success",
      message: "Restock Authorization PIN updated",
    };
  } catch (error) {
    console.error("setRestockPinService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update Restock Authorization PIN",
    };
  }
}
