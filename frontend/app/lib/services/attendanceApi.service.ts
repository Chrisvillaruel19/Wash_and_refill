// Real backend source for Attendance data — the single source both the
// Staff and Admin Attendance pages read from.
import { apiClient } from "../apiClient";
import { AttendanceRecord } from "../../staff/(dashboard)/types";

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
    timeIn: record.timeIn ?? "",
    timeOut: record.timeOut,
    totalHours: record.totalHours !== null ? Number(record.totalHours) : null,
    status: "Present",
    autoClosed: record.autoClosed,
  };
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const result = await apiClient.get<{ records: BackendAttendanceRecord[] }>("/attendance");
  return result.records.map(mapAttendanceRecord);
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
