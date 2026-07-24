import { AttendanceRecord } from "./types";
import { addActivityLog } from "./localActivity";

const STORAGE_KEY = "wrlms_attendance";

export function getStoredAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
