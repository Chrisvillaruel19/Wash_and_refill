import { AttendanceStatus } from "../../../generated/prisma/client.js";
import { getBusinessDateOnly, getBusinessDayRange } from "../../lib/business-timezone.js";

// The shop's single daily shift, in Manila time. One Staff member works
// each day, so there is no per-person roster — the shift itself is the
// schedule.
const SHIFT_START_HOUR = 8; // 8:00 AM
const SHIFT_END_HOUR = 17; // 5:00 PM

// Minutes after SHIFT_START_HOUR still counted as on time. 0 = any time-in
// after exactly 8:00 AM is Late.
const LATE_GRACE_MINUTES = 0;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// PRESENT when timed in at or before the shift start (plus grace), LATE
// otherwise — including a first time-in after the shift has already ended.
export function computeClockInStatus(timeIn: Date): AttendanceStatus {
  const { start: manilaMidnight } = getBusinessDayRange(timeIn);
  const lateAfter = manilaMidnight.getTime() + SHIFT_START_HOUR * HOUR_MS + LATE_GRACE_MINUTES * 60 * 1000;
  return timeIn.getTime() > lateAfter ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
}

// Business days (as "YYYY-MM-DD") with no Attendance row at all, from the
// earliest recorded day up to today. Today only counts once its shift has
// ended — before 5 PM, nobody has timed in *yet*, not absent.
//
// Absence is per-day, not per-person: with one Staff member per day and no
// roster, a day with no time-in means the shop had no staff that day, not
// that any specific person skipped work. These days have no Attendance row
// to attach a status to, so they're derived on read rather than stored.
export function computeAbsentDates(recordDates: Date[], now: Date = new Date()): string[] {
  if (recordDates.length === 0) return [];

  // DATE columns come back as UTC-midnight Dates — the same anchor
  // getBusinessDateOnly produces — so plain UTC-day arithmetic is safe here.
  const present = new Set(recordDates.map((d) => d.getTime()));
  const earliest = Math.min(...present);

  const today = getBusinessDateOnly(now).getTime();
  const { start: manilaMidnight } = getBusinessDayRange(now);
  const todaysShiftOver = now.getTime() >= manilaMidnight.getTime() + SHIFT_END_HOUR * HOUR_MS;
  const lastDay = todaysShiftOver ? today : today - DAY_MS;

  const absent: string[] = [];
  for (let day = earliest; day <= lastDay; day += DAY_MS) {
    if (!present.has(day)) absent.push(new Date(day).toISOString().slice(0, 10));
  }
  return absent;
}
