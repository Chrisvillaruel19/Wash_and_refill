"use client";

import { useEffect, useState } from "react";
import { Search, Pencil, Trash2, Check, X, Users } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import ConfirmDeleteModal from "../../../components/admincom/ConfirmDeleteModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { getCustomers, updateCustomerName, deleteCustomer, Customer } from "../../../lib/services/customerApi.service";
import { ApiError } from "../../../lib/apiClient";
import { isValidName, NAME_ERROR_MESSAGE, sanitizeNameInput } from "../../../lib/validation";

const PAGE_SIZE = 8;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch {
        setLoadError("Unable to load customers. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function startEdit(customer: Customer) {
    setActionError("");
    setEditingId(customer.id);
    setEditName(customer.customerName);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(id: string) {
    const trimmedName = editName.trim();
    if (!isValidName(trimmedName)) {
      setActionError(NAME_ERROR_MESSAGE);
      return;
    }
    setActionSubmitting(true);
    setActionError("");
    try {
      const updated = await updateCustomerName(id, trimmedName);
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to update customer. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionSubmitting(true);
    setActionError("");
    try {
      await deleteCustomer(deleteTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to remove customer. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber.includes(search)
  );

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredCustomers,
    PAGE_SIZE,
    search
  );

  if (loading) {
    return <p className="text-gray-400 p-6">Loading customers...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminStatCard
          label="Total Customers"
          value={customers.length}
          icon={Users}
          iconColor="text-blue-600 bg-blue-100"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="customer-search"
            autoComplete="off"
            className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      {actionError && !deleteTarget && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          {actionError}
        </p>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-3 sm:p-4 whitespace-nowrap">Name</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Phone</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Registered</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-3 sm:p-4 text-gray-900">
                      {editingId === c.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(sanitizeNameInput(e.target.value))}
                          maxLength={100}
                          autoFocus
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                        />
                      ) : (
                        c.customerName
                      )}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{c.phoneNumber}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => saveEdit(c.id)}
                            disabled={actionSubmitting}
                            className="text-green-600 hover:text-green-700 disabled:opacity-50"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={actionSubmitting}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-gray-600 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setActionError("");
                              setDeleteTarget(c);
                            }}
                            className="text-gray-600 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.customerName}
          warning="Customers with existing order history cannot be removed."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={actionSubmitting}
          submitError={actionError}
        />
      )}
    </div>
  );
}
