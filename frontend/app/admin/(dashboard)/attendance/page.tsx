"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Clock, ListChecks, Search } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import { getAttendanceRecords } from "../../../lib/services/attendanceApi.service";
import { AttendanceRecord } from "../../../staff/(dashboard)/types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const presentToday = records.filter((r) => r.date === today).length;
  const currentlyClockedIn = records.filter((r) => !r.timeOut).length;

  const filteredRecords = records.filter(
    (r) =>
      r.date.toLowerCase().includes(search.toLowerCase()) ||
      r.staffName.toLowerCase().includes(search.toLowerCase())
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
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
          label="Total Records"
          value={records.length}
          icon={ListChecks}
          iconColor="text-gray-600 bg-gray-100"
        />
      </div>

      <div className="mb-5">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Date or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="attendance-search"
            autoComplete="off"
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
