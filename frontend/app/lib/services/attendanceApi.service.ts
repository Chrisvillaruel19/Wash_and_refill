// Real backend source for Attendance data — the single source both the
// Staff and Admin Attendance pages read from.
import { apiClient } from "../apiClient";
import { AttendanceRecord, AttendanceStatus } from "../../staff/(dashboard)/types";

const STATUS_MAP: Record<string, AttendanceStatus> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
};

interface BackendAttendanceRecord {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  totalHours: string | null;
  autoClosed: boolean;
  status: string;
  user: { id: string; name: string };
}

function mapAttendanceRecord(record: BackendAttendanceRecord): AttendanceRecord {
  return {
    id: record.id,
    staffName: record.user.name,
    date: new Date(record.date).toLocaleDateString(),
    timeIn: record.timeIn,
    timeOut: record.timeOut,
    totalHours: record.totalHours !== null ? Number(record.totalHours) : null,
    status: STATUS_MAP[record.status] ?? "Present",
    autoClosed: record.autoClosed,
  };
}

// absentDates ("YYYY-MM-DD", Admin only) are days nobody timed in — they
// have no backend row, so they become placeholder rows merged into the
// date-descending list.
export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const result = await apiClient.get<{ records: BackendAttendanceRecord[]; absentDates?: string[] }>(
    "/attendance"
  );

  const rows = result.records.map((r) => ({ sortKey: r.date, record: mapAttendanceRecord(r) }));
  for (const day of result.absentDates ?? []) {
    const iso = `${day}T00:00:00.000Z`;
    rows.push({
      sortKey: iso,
      record: {
        id: `absent-${day}`,
        staffName: "No staff",
        date: new Date(iso).toLocaleDateString(),
        timeIn: "",
        timeOut: null,
        totalHours: null,
        status: "Absent",
      },
    });
  }

  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).map((r) => r.record);
}

// Clock-in/clock-out responses don't include the `user` relation (only the
// list endpoint joins it), so callers refetch getAttendanceRecords() after
// a successful call instead of mapping these responses directly.
export async function clockIn(): Promise<void> {
  await apiClient.post("/attendance/clock-in");
}

export async function clockOut(id: string): Promise<void> {
  await apiClient.post(`/attendance/${id}/clock-out`);
}

// Admin only — closes a Staff member's stuck open shift so the next Staff
// member can clock in.
export async function forceClockOut(id: string): Promise<void> {
  await apiClient.post(`/attendance/${id}/force-clock-out`);
}
