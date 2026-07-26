"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, Search, Pencil, Archive as ArchiveIcon } from "lucide-react";
import {
  Employee,
  getStoredEmployees,
  addEmployee,
  updateEmployee,
  archiveEmployee,
} from "../../../lib/localEmployees";
import EmployeeFormModal, { EmployeeFormData } from "../../../components/admincom/EmployeeFormModal";
import ConfirmArchiveModal from "../../../components/admincom/ConfirmArchiveModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

const PAGE_SIZE = 8;

type FilterTab = "All" | "Active" | "Inactive";

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmployees(getStoredEmployees());
  }, []);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const inactiveCount = employees.filter((e) => e.status === "Inactive").length;

  const filteredEmployees = employees.filter((e) => {
    const matchesFilter = activeFilter === "All" || e.status === activeFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredEmployees,
    PAGE_SIZE,
    `${activeFilter}-${search}`
  );

  function handleAddSave(data: EmployeeFormData) {
    const updated = addEmployee({
      username: data.username,
      password: data.password || "",
      name: data.name,
      email: data.email,
      phone: data.phone,
      hiredDate: data.hiredDate,
    });
    setEmployees(updated);
    setShowAddModal(false);
  }

  function handleEditSave(data: EmployeeFormData) {
    if (!editTarget) return;
    const updates: Partial<Omit<Employee, "id">> = {
      username: data.username,
      name: data.name,
      email: data.email,
      phone: data.phone,
      hiredDate: data.hiredDate,
    };
    if (data.password) {
      updates.password = data.password;
    }
    const updated = updateEmployee(editTarget.id, updates);
    setEmployees(updated);
    setEditTarget(null);
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    const updated = archiveEmployee(archiveTarget.id);
    setEmployees(updated);
    setArchiveTarget(null);
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Employees</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{employees.length}</p>
          </div>
          <Users size={28} className="text-blue-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
          </div>
          <UserCheck size={28} className="text-green-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Inactive</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{inactiveCount}</p>
          </div>
          <UserX size={28} className="text-gray-700 shrink-0" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div className="flex gap-2">
          {(["All", "Active", "Inactive"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeFilter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name or contact"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              name="employee-search"
              autoComplete="off"
              className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
          >
            Add Employee
          </button>
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        emp.status === "Active"
                          ? "text-green-600 border-green-400"
                          : "text-gray-500 border-gray-400"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditTarget(emp)}
                        className="text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setArchiveTarget(emp)}
                        className="text-gray-600 hover:text-red-600"
                        title="Archive"
                      >
                        <ArchiveIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {showAddModal && (
        <EmployeeFormModal
          onSave={handleAddSave}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {editTarget && (
        <EmployeeFormModal
          initialEmployee={editTarget}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {archiveTarget && (
        <ConfirmArchiveModal
          employeeName={archiveTarget.name}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
}
