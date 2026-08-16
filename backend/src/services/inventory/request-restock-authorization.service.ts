import crypto from "crypto";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { TokenExpiry, toMilliseconds } from "../../lib/jwt.js";

const inventoryRepository = new InventoryRepository();
const tokenRepository = new TokenRepository();

// 6 digits, always zero-padded to a fixed width so every code looks and
// reads the same length whether it's "004821" or "998214" — avoids a
// shorter-looking code being mistaken for a typo when read aloud.
function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Called by an ADMIN, from the Admin's own already-authenticated session —
// requireRole(ADMIN) on this route is what proves that, so there is no
// password to re-check here. Issues a short-lived, single-use, item-scoped
// code the Admin then reads aloud/hands to a Staff member in person; the
// Staff member never sees or enters any Admin credential, only this code.
//
// The stored token is a composite `${inventoryId}:${code}` string, hashed
// exactly like every other Token row — binding the code to one specific
// item without needing a new column, and without needing a signed JWT
// (single-use is already enforced via a DB round-trip regardless, so a
// self-contained signature buys nothing here that the existing hash+expiry
// mechanics don't already provide more simply).
export async function requestRestockAuthorizationService(adminUserId: string, inventoryId: string) {
  try {
    const item = await inventoryRepository.findById(inventoryId);
    if (!item || !item.isActive) {
      return { code: 404, status: "error", message: "Inventory item not found" };
    }

    const authCode = generateCode();
    const expiresAt = new Date(
      Date.now() + (toMilliseconds(TokenExpiry.RESTOCK_AUTHORIZATION_EXPIRES) ?? 3 * 60 * 1000)
    );

    await tokenRepository.createRestockAuthorizationToken({
      userId: adminUserId,
      token: `${inventoryId}:${authCode}`,
      expiresAt,
    });

    return {
      code: 200,
      status: "success",
      message: "Authorization code generated",
      data: {
        authorizationCode: authCode,
        expiresIn: TokenExpiry.RESTOCK_AUTHORIZATION_EXPIRES,
      },
    };
  } catch (error) {
    console.error("requestRestockAuthorizationService error", error);
    return { code: 500, status: "error", message: "Unable to generate restock authorization" };
  }
}
