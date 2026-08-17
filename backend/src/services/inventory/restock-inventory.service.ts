import { prisma } from "../../lib/prisma.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { computeStockStatus } from "./stock-status.util.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { verifyPassword } from "../../utils/password.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const inventoryRepository = new InventoryRepository();
const userRepository = new UserRepository();

// userId here is always the Staff (or Admin) member who is actually
// performing the restock — the pin proves an Admin authorized it, but
// never changes who the actor is; that stays the caller's own JWT
// identity. The PIN is a standing, shared secret an Admin sets from their
// own account settings (see set-restock-pin.service.ts) — never the
// Admin's login password, and never entered by Staff anywhere else.
export async function restockInventoryService(
  userId: string,
  id: string,
  quantity: number,
  pin: string
) {
  try {
    // Any Admin's PIN authorizes the restock — matching a shared
    // cash-drawer PIN in the physical store, since this business runs
    // with the same PIN valid for every Admin, not scoped to whichever
    // Admin happens to be logged in elsewhere.
    const admins = await userRepository.findAdminsWithRestockPin();
    const isAuthorized = admins.some(
      (admin) => admin.restockPinHash && verifyPassword(pin, admin.restockPinHash)
    );

    if (!isAuthorized) {
      return {
        code: 403,
        status: "error",
        message: "Incorrect Restock Authorization PIN.",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
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
        description: `Restocked ${quantity} ${updated.unit} of "${updated.itemName}" (PIN-authorized)`,
        oldValue: { quantity: existing.quantity },
        newValue: { quantity: updated.quantity },
      });

      return { item: updated };
    });

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
