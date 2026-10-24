"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarX, Clock, AlarmClock, Search } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import { getAttendanceRecords } from "../../../lib/services/attendanceApi.service";
import { AttendanceRecord } from "../../../staff/(dashboard)/types";
import Pagination from "../../../components/staffcom/Pagination";
import AttendanceStatusBadge from "../../../components/staffcom/AttendanceStatusBadge";
import { usePagination } from "../../../lib/usePagination";
import { formatWorked } from "../../../lib/formatDuration";

const PAGE_SIZE = 8;

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAttendanceRecords();
         
        setRecords(data);
      } catch {
        setError("Unable to load attendance records. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date().toLocaleDateString();
  // Absent rows are placeholders for days nobody timed in — never a
  // clock-in, so they're excluded from the "who's here" counts.
  const worked = records.filter((r) => r.status !== "Absent");
  const presentToday = worked.filter((r) => r.date === today).length;
  const currentlyClockedIn = worked.filter((r) => !r.timeOut).length;
  const lateCount = records.filter((r) => r.status === "Late").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;

  const query = search.toLowerCase();
  const filteredRecords = records.filter(
    (r) =>
      r.date.toLowerCase().includes(query) ||
      r.staffName.toLowerCase().includes(query) ||
      r.status.toLowerCase().includes(query)
  );

  // usePagination must run on every render regardless of loading/error
  // state — calling it after an early return would change the number of
  // hooks invoked between renders (a real Rules-of-Hooks violation, caught
  // live via React's own warning during verification, not assumed).
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredRecords,
    PAGE_SIZE,
    search
  );

  if (loading) {
    return <p className="text-gray-400 p-6">Loading attendance records...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-6">{error}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <AdminStatCard
          label="Present Today"
          value={presentToday}
          icon={CalendarCheck}
          iconColor="text-green-600 bg-green-100"
        />
        <AdminStatCard
          label="Currently Clocked In"
          value={currentlyClockedIn}
          icon={Clock}
          iconColor="text-blue-600 bg-blue-100"
        />
        <AdminStatCard
          label="Late Days"
          value={lateCount}
          icon={AlarmClock}
          iconColor="text-orange-600 bg-orange-100"
        />
        <AdminStatCard
          label="Absent Days"
          value={absentCount}
          icon={CalendarX}
          iconColor="text-red-600 bg-red-100"
        />
      </div>

      <div className="mb-5">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search date, name, or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="attendance-search"
            autoComplete="off"
            className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-3 bg-white text-gray-900 placeholder:text-gray-500 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 whitespace-nowrap text-gray-900">{r.date}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{r.staffName}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(r.timeIn)}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(r.timeOut)}</td>
                    <td className="p-3 whitespace-nowrap text-gray-900">
                      {formatWorked(r)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <AttendanceStatusBadge status={r.status} />
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
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
