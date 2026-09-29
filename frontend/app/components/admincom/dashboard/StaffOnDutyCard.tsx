import CardHeader from "./CardHeader";
import { StaffOnDuty } from "../../../lib/services/dashboard.service";
import AttendanceStatusBadge from "../../staffcom/AttendanceStatusBadge";
import { formatTime } from "./format";

interface StaffOnDutyCardProps {
  staff: StaffOnDuty[];
}

// Who timed in today (one Staff per day, 8 AM–5 PM shift) and whether they
// were on time — from the same Present/Late rules as the Attendance page.
export default function StaffOnDutyCard({ staff }: StaffOnDutyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <CardHeader title="Staff on duty today" linkHref="/admin/attendance" linkLabel="Attendance" />

      {staff.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">No one has timed in yet today.</p>
          <p className="text-gray-400 text-xs mt-1">Shift starts at 8:00 AM.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {staff.map((s, i) => {
            const onDuty = !s.timeOut;
            return (
              <li key={`${s.name}-${i}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    In {formatTime(s.timeIn)}
                    {s.timeOut ? ` · Out ${formatTime(s.timeOut)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onDuty && (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      On duty
                    </span>
                  )}
                  <AttendanceStatusBadge status={s.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
