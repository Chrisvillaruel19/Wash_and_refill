import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const attendanceRepository = new AttendanceRepository();
const shiftHandoverRepository = new ShiftHandoverRepository();

// Stable, machine-readable reason sent with the 409 so the frontend can tell
// "not on shift" apart from any other conflict and refresh its shift state.
export const NO_ACTIVE_SHIFT = "NO_ACTIVE_SHIFT";

// Staff may only do operational work (orders, expenses, restocks, customer
// edits…) during an open shift: clocked in, and not yet handed over. The
// same rule create-order.service.ts has always applied to new orders —
// after the Shift Handover the drawer is already reconciled, so anything
// recorded later would land outside it. Always read from the database for
// the given user; a missing attendance record means NOT on shift, never the
// opposite. Returns null when the user may work, otherwise the reason why not.
export async function getActiveShiftBlock(
  userId: string,
  tx: PrismaClientOrTx = prisma
): Promise<{ message: string; handoverSubmitted: boolean } | null> {
  const active = await attendanceRepository.findActiveForUser(userId, tx);
  if (!active) {
    return {
      message: "You are not clocked in. Clock in on the Attendance page before doing this.",
      handoverSubmitted: false,
    };
  }

  const handedOver =
    active.timeIn !== null && (await shiftHandoverRepository.existsForUserSince(userId, active.timeIn, tx));
  if (handedOver) {
    return {
      message:
        "You already submitted your Shift Handover for this shift. Please clock out — no more work can be recorded for this shift.",
      handoverSubmitted: true,
    };
  }

  return null;
}
