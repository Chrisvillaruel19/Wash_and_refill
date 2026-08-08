"use client";

import { useEffect, useState } from "react";
import { Users, Search, RotateCcw } from "lucide-react";
import { Employee, getEmployees, restoreEmployee } from "../../../lib/services/employeeApi.service";
import { ApiError } from "../../../lib/apiClient";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

const PAGE_SIZE = 8;

export default function ArchivePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadEmployees() {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch {
      setLoadError("Unable to load archived employees. Please try again.");
    }
  }

  useEffect(() => {
    async function initialLoad() {
      await loadEmployees();
      setLoading(false);
    }
    initialLoad();
  }, []);

  const archivedEmployees = employees.filter((e) => e.status === "Inactive");

  const filteredEmployees = archivedEmployees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredEmployees,
    PAGE_SIZE,
    search
  );

  async function handleRestore(id: string) {
    if (restoringId) return;
    setRestoringId(id);
    setActionError("");
    try {
      await restoreEmployee(id);
      await loadEmployees();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to restore employee. Please try again."
      );
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-6">Loading archived employees...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Archived Employees</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{archivedEmployees.length}</p>
          </div>
          <Users size={28} className="text-gray-400 shrink-0" />
        </div>
      </div>

      {actionError && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          {actionError}
        </p>
      )}

      <div className="mb-5">
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Name or contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="archive-search"
            autoComplete="off"
            className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-700 border-b bg-gray-50">
              <th className="p-3 whitespace-nowrap">Username</th>
              <th className="p-3 whitespace-nowrap">Email</th>
              <th className="p-3 whitespace-nowrap">Phone</th>
              <th className="p-3 whitespace-nowrap">Hired Date</th>
              <th className="p-3 whitespace-nowrap">Status</th>
              <th className="p-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap text-gray-900">{emp.username}</td>
                  <td className="p-3 whitespace-nowrap text-gray-900">{emp.email}</td>
                  <td className="p-3 whitespace-nowrap text-gray-900">{emp.phone}</td>
                  <td className="p-3 whitespace-nowrap text-gray-900">{emp.hiredDate}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border text-gray-500 border-gray-400">
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      onClick={() => handleRestore(emp.id)}
                      disabled={restoringId === emp.id}
                      className="text-gray-600 hover:text-blue-600 disabled:opacity-50"
                      title="Restore"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No archived employees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
