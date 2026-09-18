import { prisma } from "../../lib/prisma.js";
import { Prisma, OrderStatus, Role } from "../../../generated/prisma/client.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const attendanceRepository = new AttendanceRepository();

// Strict, sequential, forward-only — no skipping steps, no going backward.
// CANCELLED is intentionally not reachable through this map at all; it has
// its own dedicated endpoint/service with its own guard (see
// cancel-order.service.ts), separate from ordinary status progression.
const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  [OrderStatus.PENDING]: OrderStatus.IN_PROGRESS,
  [OrderStatus.IN_PROGRESS]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.CLAIMED,
  [OrderStatus.CLAIMED]: null,
  [OrderStatus.CANCELLED]: null,
};

export function isValidStatusTransition(current: OrderStatus, target: OrderStatus): boolean {
  return NEXT_STATUS[current] === target;
}

export function isCancellable(current: OrderStatus): boolean {
  return (
    current === OrderStatus.PENDING ||
    current === OrderStatus.IN_PROGRESS ||
    current === OrderStatus.READY
  );
}

// Shared shop work, not permanent personal ownership: WRLMS is one
// physical shop with one shared order queue, and an outgoing Staff member
// shouldn't have to stay (or have someone re-open the order later) just to
// advance, pay, or cancel their own leftover orders — the next Staff on
// shift continues them once that Staff member is actually gone. "Gone" is
// defined by Attendance, not by Shift Handover claiming: an order only
// becomes claimable into a Shift Handover once PAID (see
// lockUnclaimedPaidIds), so an unpaid/unfinished order could never be
// released to the next shift if "unclaimed" meant "reconciled" instead.
// While the creator IS still actively clocked in, the order is theirs
// alone — another Staff member mid-shift shouldn't be able to reach into
// someone else's in-progress work. Order.userId always still records who
// originally created the order (accountability, never reassigned by any
// update path in this codebase); this only gates WHO may act on it right
// now. Every mutation's own writeAuditLog call records the ACTING user's
// id separately from Order.userId, so "who did what" stays fully
// traceable even when the actor isn't the creator.
export async function canModifyOrder(
  orderOwnerUserId: string,
  actorUserId: string,
  actorRole: Role | undefined,
  tx: PrismaClientOrTx = prisma
): Promise<boolean> {
  if (actorRole === Role.ADMIN) return true;
  if (orderOwnerUserId === actorUserId) return true;

  const creatorActiveAttendance = await attendanceRepository.findActiveForUser(orderOwnerUserId, tx);
  return creatorActiveAttendance === null;
}
