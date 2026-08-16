import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { verifyPassword } from "../../utils/password.js";
import { signRestockAuthorization, TokenExpiry, toMilliseconds } from "../../lib/jwt.js";
import { Role } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();
const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

// Verifies the Admin's credentials once, here, and turns them into a
// short-lived, single-use, item-scoped authorization the Staff caller can
// then present to POST /:id/restock. The Admin's password never travels
// any further than this function — it is not part of the restock request
// itself, never stored, never logged. Deliberately mirrors
// verifyPasswordService's exact checks (findByUsername, verifyPassword,
// ACTIVE, role === ADMIN) rather than calling it, so this file's behavior
// doesn't silently change if that one is ever touched for its own
// unrelated /auth/verify-password caller.
export async function requestRestockAuthorizationService(
  staffUserId: string,
  inventoryId: string,
  adminUsername: string,
  adminPassword: string
) {
  try {
    const item = await inventoryRepository.findById(inventoryId);
    if (!item || !item.isActive) {
      return { code: 404, status: "error", message: "Inventory item not found" };
    }

    const admin = await userRepository.findByUsername(adminUsername);
    if (!admin || !verifyPassword(adminPassword, admin.password) || admin.accountStatus !== "ACTIVE") {
      return { code: 401, status: "error", message: "Invalid Admin username or password" };
    }
    if (admin.role !== Role.ADMIN) {
      return { code: 403, status: "error", message: "Only an Admin account can authorize this action" };
    }

    const authorizationToken = signRestockAuthorization(
      { staffUserId, inventoryId, authorizedByAdminId: admin.id },
      TokenExpiry.RESTOCK_AUTHORIZATION_EXPIRES
    );

    await tokenRepository.createRestockAuthorizationToken({
      userId: staffUserId,
      token: authorizationToken,
      expiresAt: new Date(
        Date.now() + (toMilliseconds(TokenExpiry.RESTOCK_AUTHORIZATION_EXPIRES) ?? 3 * 60 * 1000)
      ),
    });

    return {
      code: 200,
      status: "success",
      message: "Authorized",
      data: {
        authorizationToken,
        expiresIn: TokenExpiry.RESTOCK_AUTHORIZATION_EXPIRES,
      },
    };
  } catch (error) {
    console.error("requestRestockAuthorizationService error", error);
    return { code: 500, status: "error", message: "Unable to authorize restock" };
  }
}
