import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { ShiftHandoverInventoryRepository } from "../../repositories/shift-handover-inventory.repository.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const shiftHandoverInventoryRepository = new ShiftHandoverInventoryRepository();
const inventoryRepository = new InventoryRepository();

// A shift's beginning count per supply item — one rule for the submitted
// handover snapshot and the Staff's live "Beginning → Now" preview:
//  - normally the item's ending count on the most recent handover that
//    counted it (global — one shared stockroom, same as the one drawer);
//  - if no handover ever counted it (the very first handover, or an item
//    added since), it's rebuilt as: current stock + what orders created
//    since `since` used (net of cancellations, which put stock back). So the
//    first shift still shows what it really used, not 0. Restocks during
//    that first period aren't separated out — there's no earlier count.
// `since` = the previous handover's end (null = none ever: count every order).
export async function getBeginningQuantities(
  items: { id: string; quantity: number }[],
  since: Date | null,
  tx: PrismaClientOrTx = prisma
): Promise<Map<string, number>> {
  const ids = items.map((i) => i.id);
  const counted = await shiftHandoverInventoryRepository.findLatestEndingQtyByInventoryIds(ids, tx);
  const uncounted = ids.filter((id) => !counted.has(id));
  const used = await inventoryRepository.sumNetConsumedSince(uncounted, since, tx);
  return new Map(items.map((i) => [i.id, counted.get(i.id) ?? i.quantity + (used.get(i.id) ?? 0)]));
}
