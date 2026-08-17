import { UserRepository } from "../../repositories/user.repository.js";

const userRepository = new UserRepository();

// Pre-check only — lets the Staff Authorization modal tell the user
// immediately whether a PIN is right or wrong, before they're allowed to
// proceed to the quantity/restock screen. Never mutates inventory, never
// writes an audit record (a failed or successful *check* is not itself a
// restock), and never returns anything beyond a boolean. The actual
// restock endpoint (restockInventoryService) re-verifies the PIN itself
// and is the only authoritative check — this one exists purely for UX.
export async function verifyRestockPinService(pin: string) {
  try {
    const valid = await userRepository.verifyRestockPin(pin);

    return {
      code: 200,
      status: "success",
      message: valid ? "PIN verified" : "Incorrect Restock Authorization PIN.",
      data: { valid },
    };
  } catch (error) {
    console.error("verifyRestockPinService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to verify PIN",
    };
  }
}
