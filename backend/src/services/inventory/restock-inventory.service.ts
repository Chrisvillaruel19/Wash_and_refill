import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { verifyRestockAuthorization } from "../../lib/jwt.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();
const tokenRepository = new TokenRepository();

// userId here is always the Staff (or Admin) member who is actually
// performing the restock — the authorizationToken proves an Admin approved
// it, but never changes who the actor is; that stays the caller's own JWT
// identity, exactly as before this authorization step existed.
export async function restockInventoryService(
  userId: string,
  id: string,
  quantity: number,
  authorizationToken: string
) {
  try {
    // Verified before touching the database at all: a forged, expired, or
    // wrong-type token is rejected by signature/exp check alone, with no
    // query cost. staffUserId/inventoryId binding stops one staff member's
    // authorization from being replayed by another, or against a
    // different item than the Admin actually approved.
    const authPayload = verifyRestockAuthorization(authorizationToken);
    if (!authPayload || authPayload.staffUserId !== userId || authPayload.inventoryId !== id) {
      return {
        code: 403,
        status: "error",
        message: "Invalid restock authorization. Please request a new Admin authorization.",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Consumed first, inside the same transaction as the restock write —
      // if the restock below fails for any reason, the rollback also
      // un-consumes this, so a genuinely failed attempt doesn't burn the
      // Admin's one-time approval.
      const consumed = await tokenRepository.consumeRestockAuthorizationToken(authorizationToken, tx);
      if (consumed.count === 0) {
        return { authAlreadyUsed: true as const };
      }

      const existing = await inventoryRepository.findById(id, tx);
      if (!existing || !existing.isActive) return { notFound: true as const };

      const restocked = await inventoryRepository.incrementQuantity(id, quantity, tx);

      // Increment doesn't know about lowStockThreshold, so stockStatus is
      // recomputed as a second, explicit write rather than trusted stale.
      const stockStatus = computeStockStatus(restocked.quantity, restocked.lowStockThreshold);
      const updated = await inventoryRepository.setStockStatus(id, stockStatus, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.RESTOCK,
        module: "Inventory",
        description: `Restocked ${quantity} ${updated.unit} of "${updated.itemName}" (Admin-authorized)`,
        oldValue: { quantity: existing.quantity },
        newValue: { quantity: updated.quantity, authorizedByAdminId: authPayload.authorizedByAdminId },
      });

      return { item: updated };
    });

    if ("authAlreadyUsed" in result) {
      return {
        code: 403,
        status: "error",
        message: "This authorization has expired or was already used. Please request a new Admin authorization.",
      };
    }
    if ("notFound" in result) {
      return {
        code: 404,
        status: "error",
        message: "Inventory item not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: `Restocked ${quantity} ${result.item.unit} of ${result.item.itemName}`,
      data: { item: result.item },
    };
  } catch (error) {
    console.error("restockInventoryService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to restock inventory item",
    };
  }
}
