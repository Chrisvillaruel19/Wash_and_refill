import { AttendanceRecord } from "./types";
import { addActivityLog } from "./localActivity";

const STORAGE_KEY = "wrlms_attendance";

// Realistic ceiling for one laundry-shop shift. Past this many hours still
// clocked in almost certainly means a forgotten clock-out, not real work —
// auto-close it rather than let elapsed time run away across days.
const MAX_SESSION_HOURS = 16;

// Runs on every read so a stale session gets closed the next time anyone
// (staff or Admin) loads attendance data — no background job exists in this
// localStorage-backed app, so "lazy sweep on read" is the reliable trigger.
function autoCloseStaleRecords(records: AttendanceRecord[]): {
  records: AttendanceRecord[];
  changed: boolean;
} {
  let changed = false;
  const now = Date.now();

  const updated = records.map((record) => {
    if (record.timeOut) return record;

    const timeInDate = new Date(record.timeIn);
    const elapsedHours = (now - timeInDate.getTime()) / (1000 * 60 * 60);
    if (elapsedHours <= MAX_SESSION_HOURS) return record;

    changed = true;
    // Closed at the threshold point, not "now" — keeps totalHours capped and
    // avoids the record silently absorbing however long it's been forgotten.
    const closedAt = new Date(timeInDate.getTime() + MAX_SESSION_HOURS * 60 * 60 * 1000);

    addActivityLog({
      type: "autoclockout",
      message: `${record.staffName}'s shift on ${record.date} was auto-closed after ${MAX_SESSION_HOURS}h (forgotten clock-out)`,
    });

    return {
      ...record,
      timeOut: closedAt.toISOString(),
      totalHours: MAX_SESSION_HOURS,
      autoClosed: true,
    };
  });

  return { records: updated, changed };
}

export function getStoredAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
    const { records: swept, changed } = autoCloseStaleRecords(records);
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(swept));
    }
    return swept;
  } catch {
    return [];
  }
}

export function clockIn(staffName: string): AttendanceRecord[] {
  const existing = getStoredAttendance();
  const now = new Date();

  const record: AttendanceRecord = {
    id: `${Date.now()}`,
    staffName,
    date: now.toLocaleDateString(),
    timeIn: now.toISOString(),
    timeOut: null,
    totalHours: null,
    status: "Present",
  };

  const updated = [record, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  addActivityLog({
    type: "clockin",
    message: `${staffName} clocked in`,
  });

  return updated;
}

export function clockOut(id: string): AttendanceRecord[] {
  const existing = getStoredAttendance();
  const now = new Date();
  let clockedOutStaffName = "";

  const updated = existing.map((record) => {
    if (record.id !== id || record.timeOut) return record;

    clockedOutStaffName = record.staffName;
    const timeInDate = new Date(record.timeIn);
    const hours = (now.getTime() - timeInDate.getTime()) / (1000 * 60 * 60);

    return {
      ...record,
      timeOut: now.toISOString(),
      totalHours: Math.round(hours * 10) / 10,
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  if (clockedOutStaffName) {
    addActivityLog({
      type: "clockout",
      message: `${clockedOutStaffName} clocked out`,
    });
  }

  return updated;
}

export function getActiveRecord(staffName: string): AttendanceRecord | null {
  const existing = getStoredAttendance();
  return existing.find((r) => r.staffName === staffName && !r.timeOut) || null;
}
