// Worked time for Attendance, to the minute.

type WorkedRecord = { timeIn: string | null; timeOut: string | null; totalHours: number | null };

// Minutes between time in and time out — from the exact timestamps, so it's
// never off by the rounding older records were saved with (0.1-hour steps).
// Falls back to the saved total when a timestamp is missing. null = still
// on duty (or never timed in).
export function workedMinutes(r: WorkedRecord): number | null {
  if (r.timeIn && r.timeOut) {
    return Math.max(0, Math.round((new Date(r.timeOut).getTime() - new Date(r.timeIn).getTime()) / 60000));
  }
  return r.totalHours !== null ? Math.round(r.totalHours * 60) : null;
}

// 12 → "12 min", 60 → "1 hour", 120 → "2 hours", 90 → "1 hr 30 min".
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 1) return "Under 1 min";
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} hr ${mins} min`;
}

// A record's worked time for a table cell ("-" while on duty or absent).
export function formatWorked(r: WorkedRecord): string {
  const m = workedMinutes(r);
  return m === null ? "-" : formatDuration(m);
}
