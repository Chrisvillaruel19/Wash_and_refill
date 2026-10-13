"use client";

import Link from "next/link";
import { useActiveShift } from "../../lib/useActiveShift";

// Shown at the top of Staff pages that record operational work, whenever the
// user isn't on an active shift. Read-only pages don't need it.
export default function ShiftRequiredNotice() {
  const { state, message } = useActiveShift();
  if (state === "onShift" || state === "loading") return null;

  return (
    <div
      role="alert"
      className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
    >
      <span>{message}</span>
      {state === "notClockedIn" && (
        <Link href="/staff/attendance" className="font-medium underline whitespace-nowrap">
          Go to Attendance
        </Link>
      )}
    </div>
  );
}
