import { prisma } from "../../lib/prisma.js";
import { DrawerStateRepository } from "../../repositories/drawer-state.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const drawerStateRepository = new DrawerStateRepository();

// Admin-only (enforced by requireRole at the route). Validation of the
// value itself (positive, finite, sane max) already happened in
// update-drawer-settings.schema.ts before this ever runs — this service
// only does the write + audit. Never touches any existing ShiftHandover
// row: the new default only ever feeds getDrawerStart()'s "no previous
// handover" branch for shifts submitted after this change.
export async function updateDrawerSettingsService(adminUserId: string, defaultStartingCash: number) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await drawerStateRepository.get(tx);
      const result = await drawerStateRepository.updateDefaultStartingCash(defaultStartingCash, tx);

      await writeAuditLog(tx, {
        userId: adminUserId,
        action: AuditAction.UPDATE,
        module: "DrawerState",
        description: `Default starting cash changed from ₱${Number(existing.defaultStartingCash).toFixed(2)} to ₱${defaultStartingCash.toFixed(2)}`,
        oldValue: { defaultStartingCash: existing.defaultStartingCash.toString() },
        newValue: { defaultStartingCash: result.defaultStartingCash.toString() },
      });

      return result;
    });

    return {
      code: 200,
      status: "success",
      message: "Default starting cash updated",
      data: { defaultStartingCash: updated.defaultStartingCash },
    };
  } catch (error) {
    console.error("updateDrawerSettingsService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update default starting cash",
    };
  }
}
