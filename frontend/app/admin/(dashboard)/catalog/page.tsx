"use client";

import { useEffect, useState } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import {
  getStoredInventory,
  addInventoryItem,
  updateItem,
  deleteInventoryItem,
} from "../../../staff/(dashboard)/localInventory";
import { InventoryItem } from "../../../staff/(dashboard)/types";
import AdminInventoryFormModal, {
  InventoryFormData,
} from "../../../components/admincom/AdminInventoryFormModal";
import ConfirmDeleteModal from "../../../components/admincom/ConfirmDeleteModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { getCurrentUser } from "../../../lib/auth";

const PAGE_SIZE = 8;

type CatalogTab = "supplies" | "dropoff" | "service";

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("supplies");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const adminName = getCurrentUser()?.name || "Admin";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getStoredInventory());
  }, []);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredItems,
    PAGE_SIZE,
    search
  );

  function handleAddSave(data: InventoryFormData) {
    const updated = addInventoryItem(data);
    setItems(updated);
    setShowAddModal(false);
  }

  function handleEditSave(data: InventoryFormData) {
    if (!editTarget) return;
    const updated = updateItem(editTarget.id, data, adminName);
    setItems(updated);
    setEditTarget(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const updated = deleteInventoryItem(deleteTarget.id);
    setItems(updated);
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {activeTab === "supplies"
            ? "Laundry Supplies"
            : activeTab === "dropoff"
            ? "Laundry Drop off"
            : "Laundry Service"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("dropoff")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "dropoff"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View drop off
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "service"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View laundry Service
          </button>
          {activeTab !== "supplies" && (
            <button
              onClick={() => setActiveTab("supplies")}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              View laundry Supplies
            </button>
          )}
        </div>
      </div>

      {activeTab !== "supplies" ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">
          Coming in a later step.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Item"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                name="catalog-search"
                autoComplete="off"
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
            >
              + Add Item
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-3 sm:p-4 whitespace-nowrap">Item Name</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Current Stock</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Low Stock Alert</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Unit</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Price</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => {
                      const isLow = item.currentStock <= item.lowStockAlert;
                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-3 sm:p-4 font-medium whitespace-nowrap text-gray-900">
                            {item.name}
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                            {item.currentStock}
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                            {item.lowStockAlert}
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{item.unit}</td>
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">₱{item.price}</td>
                          <td className="p-3 sm:p-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                isLow
                                  ? "text-red-600 border-red-300 bg-red-50"
                                  : "text-green-600 border-green-300 bg-green-50"
                              }`}
                            >
                              {isLow ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setEditTarget(item)}
                                className="text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="text-gray-500 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {showAddModal && (
        <AdminInventoryFormModal onSave={handleAddSave} onCancel={() => setShowAddModal(false)} />
      )}

      {editTarget && (
        <AdminInventoryFormModal
          initialItem={editTarget}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
