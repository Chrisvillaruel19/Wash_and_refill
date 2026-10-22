import { UserRound } from "lucide-react";
import CardHeader from "./CardHeader";
import { StaffOnDuty } from "../../../lib/services/dashboard.service";
import AttendanceStatusBadge from "../../staffcom/AttendanceStatusBadge";
import { formatTime } from "./format";

interface StaffOnDutyCardProps {
  staff: StaffOnDuty[];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Who timed in today (one Staff per day, 8 AM–5 PM shift) and whether they
// were on time — from the same Present/Late rules as the Attendance page.
export default function StaffOnDutyCard({ staff }: StaffOnDutyCardProps) {
  // Whoever is on duty right now first, then the rest newest time-in first.
  const timeInOf = (s: StaffOnDuty) => (s.timeIn ? new Date(s.timeIn).getTime() : 0);
  const sorted = [...staff].sort((a, b) => {
    const onDutyFirst = Number(!a.timeOut) - Number(!b.timeOut);
    return onDutyFirst !== 0 ? -onDutyFirst : timeInOf(b) - timeInOf(a);
  });

  return (
    <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6 h-full flex flex-col">
      <CardHeader title="Staff on duty today" linkHref="/admin/attendance" linkLabel="Attendance" />

      {staff.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <UserRound size={28} className="text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-600">No one has timed in yet today.</p>
          <p className="text-xs text-gray-500">Shift starts at 8:00 AM.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {sorted.map((s, i) => {
            const onDuty = !s.timeOut;
            return (
              <li key={`${s.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="relative shrink-0" aria-hidden="true">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 text-sky-700 text-sm font-semibold">
                    {initials(s.name)}
                  </span>
                  {/* Green = still on duty, gray = timed out. */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                      onDuty ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-600 tabular-nums">
                    {onDuty
                      ? `On duty since ${formatTime(s.timeIn)}`
                      : `${formatTime(s.timeIn)} – ${formatTime(s.timeOut)}`}
                  </p>
                </div>
                <AttendanceStatusBadge status={s.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
