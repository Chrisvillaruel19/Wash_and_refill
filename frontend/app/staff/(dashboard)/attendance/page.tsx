"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAttendance, clockIn, clockOut } from "../localAttendance";
import { getUnreportedActivity } from "../localShiftHandover";
import { getCurrentUser } from "../../../lib/auth";
import { AttendanceRecord } from "../types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

const PAGE_SIZE = 8;

export default function Attendance() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [now, setNow] = useState(new Date());
  const [unreportedModal, setUnreportedModal] = useState<{ orders: number; expenses: number } | null>(
    null
  );

  const staffName = getCurrentUser()?.name || "Unknown";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(getStoredAttendance());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const activeRecord = records.find((r) => r.staffName === staffName && !r.timeOut) || null;

  const totalHours = records
    .filter((r) => r.staffName === staffName && r.totalHours !== null)
    .reduce((sum, r) => sum + (r.totalHours || 0), 0);

  const todayShiftHours = activeRecord
    ? Math.max(0, (now.getTime() - new Date(activeRecord.timeIn).getTime()) / (1000 * 60 * 60))
    : null;

  function formatTime(iso: string | null) {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function handleTimeAction() {
    if (activeRecord) {
      // Money math is on the line here, so this blocks outright rather than
      // showing a dismissable warning — clocking out is not allowed until
      // whatever's unreported gets reported via Shift Handover.
      const { orders, expenses } = getUnreportedActivity(staffName);
      if (orders.length > 0 || expenses.length > 0) {
        setUnreportedModal({ orders: orders.length, expenses: expenses.length });
        return;
      }
      setRecords(clockOut(activeRecord.id));
    } else {
      setRecords(clockIn(staffName));
    }
  }

  const { page, setPage, totalPages, paginatedItems } = usePagination(records, PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance</h1>

      <div className="bg-blue-600 rounded-xl p-5 sm:p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Current Status</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div>
            <p className="text-blue-100 text-sm">Current Time</p>
            <p className="text-white text-xl font-bold">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Time in</p>
            <p className="text-white text-xl font-bold">{formatTime(activeRecord?.timeIn ?? null)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Today shift hours</p>
            <p className="text-white text-xl font-bold">
              {todayShiftHours !== null ? todayShiftHours.toFixed(1) : "--:--"}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Hours</p>
            <p className="text-white text-xl font-bold">{totalHours.toFixed(1)}</p>
          </div>
        </div>

        <button
          onClick={handleTimeAction}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            activeRecord ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {activeRecord ? "Time Out" : "Time In"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Attendance History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-3 whitespace-nowrap">Date</th>
                <th className="p-3 whitespace-nowrap">Staff</th>
                <th className="p-3 whitespace-nowrap">Time in</th>
                <th className="p-3 whitespace-nowrap">Time out</th>
                <th className="p-3 whitespace-nowrap">Total Hours</th>
                <th className="p-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap text-gray-900">{r.date}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{r.staffName}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(r.timeIn)}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(r.timeOut)}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">
                      {r.totalHours !== null ? r.totalHours.toFixed(1) : "-"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-medium border text-green-600 border-green-300 bg-green-50">
                        {r.status}
                      </span>
                      {r.autoClosed && (
                        <span className="ml-1 px-3 py-1 rounded-full text-xs font-medium border text-amber-600 border-amber-300 bg-amber-50">
                          Auto-closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {unreportedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unreported Activity</h3>
            <p className="text-sm text-gray-600 mb-5">
              You have {unreportedModal.orders} unreported order
              {unreportedModal.orders === 1 ? "" : "s"}
              {unreportedModal.expenses > 0 &&
                ` and ${unreportedModal.expenses} unreported expense${
                  unreportedModal.expenses === 1 ? "" : "s"
                }`}{" "}
              since your last Shift Handover. Submit a Shift Handover before clocking out.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUnreportedModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push("/staff/shifthandover")}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Shift Handover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
