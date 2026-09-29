import { AttendanceStatus } from "../../staff/(dashboard)/types";

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  Present: "text-green-600 border-green-300 bg-green-50",
  Late: "text-orange-600 border-orange-300 bg-orange-50",
  Absent: "text-red-600 border-red-300 bg-red-50",
};

// Shared by the Staff and Admin Attendance tables.
export default function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}
