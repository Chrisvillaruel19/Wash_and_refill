import { ShiftHandoverRecord } from "./types";
import { addActivityLog } from "./localActivity";

const STORAGE_KEY = "wrlms_shift_handover";

export function getStoredShiftHandovers(): ShiftHandoverRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function submitShiftHandover(
  record: Omit<ShiftHandoverRecord, "id" | "timestamp">
): ShiftHandoverRecord[] {
  const existing = getStoredShiftHandovers();

  const newRecord: ShiftHandoverRecord = {
    ...record,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  addActivityLog({
    type: "update",
    message: `${record.staffName} submitted shift handover records`,
  });

  return updated;
}
