import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();
const tokenRepository = new TokenRepository();

// userId here is always the Staff (or Admin) member who is actually
// performing the restock — the authorizationCode proves an Admin approved
// it, but never changes who the actor is; that stays the caller's own JWT
// identity. The code itself is never the Admin's password or any other
// credential — it's an opaque, single-use, 6-digit value an Admin
// generated from their own session and handed over in person.
export async function restockInventoryService(
  userId: string,
  id: string,
  quantity: number,
  authorizationCode: string
) {
  try {
    // Binding the item id into the lookup key (not just the raw code)
    // means a code issued for item A can never redeem against item B —
    // scoping is enforced by which hash matches, not by a separate column.
    const composite = `${id}:${authorizationCode.trim()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Read first (for the audit log's authorizedByAdminId) — the actual
      // enforcement is the atomic consume immediately after, whose WHERE
      // clause re-checks everything this read already confirmed.
      const authRecord = await tokenRepository.findActiveRestockAuthorizationToken(composite, tx);
      if (!authRecord) return { authFailed: true as const };

      // Atomic conditional consume, not read-then-write: if two requests
      // race to redeem the same code, only one's updateMany matches a row.
      const consumed = await tokenRepository.consumeRestockAuthorizationToken(composite, tx);
      if (consumed.count === 0) {
        return { authFailed: true as const };
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
        newValue: { quantity: updated.quantity, authorizedByAdminId: authRecord.userId },
      });

      return { item: updated };
    });

    if ("authFailed" in result) {
      return {
        code: 403,
        status: "error",
        message: "Invalid, expired, or already-used authorization code. Please ask an Admin for a new one.",
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
