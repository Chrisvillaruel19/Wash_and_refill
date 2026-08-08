import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { prisma } from "../../lib/prisma.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const attendanceRepository = new AttendanceRepository();

// Realistic ceiling for one laundry-shop shift, mirrored exactly from the
// frontend's MAX_SESSION_HOURS. Past this many hours still clocked in
// almost certainly means a forgotten clock-out, not real work.
const MAX_SESSION_HOURS = 16;

// Lazy sweep on read — same pattern as the frontend's autoCloseStaleRecords:
// there's no background job in this system, so the reliable trigger is
// "the next time anyone reads attendance data." Closes each stale session
// AT the threshold point (not "now"), capping totalHours rather than
// letting it silently absorb however long it's actually been forgotten.
//
// Owns its own transaction (no caller currently passes one in, and none
// needs to): every closed record and its audit entry commit together, one
// batch, one atomic unit. There's no human actor for a system-triggered
// sweep — the audit entry is attributed to the affected employee (it's a
// record about their shift), with the description making clear the system,
// not the employee, closed it.
export async function sweepStaleAttendance(): Promise<void> {
  const cutoff = new Date(Date.now() - MAX_SESSION_HOURS * 60 * 60 * 1000);

  // Cheap, transaction-less check first. The overwhelming majority of calls
  // find nothing stale, and opening a full transaction just to discover
  // that was exhausting Neon's connection pool under real read frequency
  // (P2028 "unable to start a transaction in the given time"). Only pay
  // for a transaction when there's actually something to close — the sweep
  // logic itself, below, is byte-for-byte unchanged.
  const precheck = await attendanceRepository.findOpenSessionsOlderThan(cutoff);
  if (precheck.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const stale = await attendanceRepository.findOpenSessionsOlderThan(cutoff, tx);

    for (const record of stale) {
      if (!record.timeIn) continue;
      const closedAt = new Date(record.timeIn.getTime() + MAX_SESSION_HOURS * 60 * 60 * 1000);

      await attendanceRepository.closeSession(
        record.id,
        { timeOut: closedAt, totalHours: MAX_SESSION_HOURS, autoClosed: true },
        tx
      );

      await writeAuditLog(tx, {
        userId: record.userId,
        action: AuditAction.UPDATE,
        module: "Attendance",
        description: `System auto-closed this shift after ${MAX_SESSION_HOURS}h (forgotten clock-out)`,
        newValue: { timeOut: closedAt, totalHours: MAX_SESSION_HOURS, autoClosed: true },
      });
    }
  });
}
