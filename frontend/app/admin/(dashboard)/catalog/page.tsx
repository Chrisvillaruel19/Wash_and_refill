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
import {
  getStoredPackages,
  addPackage,
  updatePackage,
  deletePackage,
} from "../../../lib/localPackages";
import {
  getStoredServices,
  addService,
  updateService,
  deleteService,
} from "../../../lib/localServices";
import { Package, ServiceItem } from "../../../staff/(dashboard)/neworder/types";
import { serviceCategories } from "../../../staff/(dashboard)/neworder/data";
import AdminInventoryFormModal, {
  InventoryFormData,
} from "../../../components/admincom/AdminInventoryFormModal";
import AdminPackageFormModal, {
  PackageFormData,
} from "../../../components/admincom/AdminPackageFormModal";
import AdminServiceFormModal, {
  ServiceFormData,
} from "../../../components/admincom/AdminServiceFormModal";
import ConfirmDeleteModal from "../../../components/admincom/ConfirmDeleteModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { getCurrentUser } from "../../../lib/auth";

const PAGE_SIZE = 8;

type CatalogTab = "supplies" | "dropoff" | "service";
type ServiceFilter = "All" | string;

const HISTORICAL_WARNING =
  "Renaming or deleting may affect how historical orders appear in Shift Handover reports.";

const SERVICE_HISTORICAL_WARNING =
  "Renaming or deleting may cause this service to no longer group correctly with historical orders in reports.";

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("supplies");

  // Supplies (Laundry Supplies) state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Drop off (Packages) state
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageSearch, setPackageSearch] = useState("");
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [editPackageTarget, setEditPackageTarget] = useState<Package | null>(null);
  const [deletePackageTarget, setDeletePackageTarget] = useState<Package | null>(null);

  // Laundry Service state
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("All");
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editServiceTarget, setEditServiceTarget] = useState<ServiceItem | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<ServiceItem | null>(null);

  const adminName = getCurrentUser()?.name || "Admin";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getStoredInventory());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackages(getStoredPackages());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServices(getStoredServices());
  }, []);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredItems,
    PAGE_SIZE,
    search
  );

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(packageSearch.toLowerCase())
  );

  const filteredServices = services.filter((svc) => {
    const matchesFilter = serviceFilter === "All" || svc.categoryId === serviceFilter;
    const matchesSearch = svc.name.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const {
    page: servicePage,
    setPage: setServicePage,
    totalPages: serviceTotalPages,
    paginatedItems: paginatedServices,
  } = usePagination(filteredServices, PAGE_SIZE, `${serviceFilter}-${serviceSearch}`);

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

  function handleAddPackageSave(data: PackageFormData) {
    const updated = addPackage(data);
    setPackages(updated);
    setShowAddPackageModal(false);
  }

  function handleEditPackageSave(data: PackageFormData) {
    if (!editPackageTarget) return;
    const updated = updatePackage(editPackageTarget.id, data);
    setPackages(updated);
    setEditPackageTarget(null);
  }

  function handleDeletePackageConfirm() {
    if (!deletePackageTarget) return;
    const updated = deletePackage(deletePackageTarget.id);
    setPackages(updated);
    setDeletePackageTarget(null);
  }

  function handleAddServiceSave(data: ServiceFormData) {
    const updated = addService(data);
    setServices(updated);
    setShowAddServiceModal(false);
  }

  function handleEditServiceSave(data: ServiceFormData) {
    if (!editServiceTarget) return;
    const updated = updateService(editServiceTarget.id, data);
    setServices(updated);
    setEditServiceTarget(null);
  }

  function handleDeleteServiceConfirm() {
    if (!deleteServiceTarget) return;
    const updated = deleteService(deleteServiceTarget.id);
    setServices(updated);
    setDeleteServiceTarget(null);
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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("supplies")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === "supplies"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View laundry Supplies
          </button>
          <button
            onClick={() => setActiveTab("dropoff")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === "dropoff"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View drop off
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === "service"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View laundry Service
          </button>
        </div>
      </div>

      {activeTab === "service" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <button
                onClick={() => setServiceFilter("All")}
                className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  serviceFilter === "All"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setServiceFilter(cat.id)}
                  className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    serviceFilter === cat.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search type or item name"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                name="service-search"
                autoComplete="off"
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <button
              onClick={() => setShowAddServiceModal(true)}
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
                    <th className="p-3 sm:p-4 whitespace-nowrap">Type</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Name</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Price</th>
                    <th className="p-3 sm:p-4 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedServices.length > 0 ? (
                    paginatedServices.map((svc) => {
                      const categoryName =
                        serviceCategories.find((c) => c.id === svc.categoryId)?.name ?? svc.categoryId;
                      return (
                        <tr key={svc.id} className="border-b last:border-0">
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{categoryName}</td>
                          <td className="p-3 sm:p-4 font-medium whitespace-nowrap text-gray-900">
                            {svc.name}
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                            ₱{svc.pricePerKg.toFixed(2)}
                          </td>
                          <td className="p-3 sm:p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setEditServiceTarget(svc)}
                                className="text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteServiceTarget(svc)}
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
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No services found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={servicePage} totalPages={serviceTotalPages} onPageChange={setServicePage} />
        </>
      )}

      {activeTab === "supplies" && (
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

      {activeTab === "dropoff" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search item name"
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                name="package-search"
                autoComplete="off"
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <button
              onClick={() => setShowAddPackageModal(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
            >
              + Add Item
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            {filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPackages.map((pkg) => (
                  <div key={pkg.id} className={`${pkg.color} text-white rounded-xl p-4 sm:p-5 relative`}>
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1">
                      <button
                        onClick={() => setEditPackageTarget(pkg)}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletePackageTarget(pkg)}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold mb-2">{pkg.name}</h4>
                    <p className="text-xl sm:text-2xl font-bold mb-2">₱ {pkg.price.toFixed(2)}</p>
                    <p className="text-xs opacity-90">Liquid Detergent: {pkg.liquidDetergent}</p>
                    <p className="text-xs opacity-90">Downy: {pkg.downy}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No packages found.</p>
            )}
          </div>
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

      {showAddPackageModal && (
        <AdminPackageFormModal
          onSave={handleAddPackageSave}
          onCancel={() => setShowAddPackageModal(false)}
        />
      )}

      {editPackageTarget && (
        <AdminPackageFormModal
          initialPackage={editPackageTarget}
          onSave={handleEditPackageSave}
          onCancel={() => setEditPackageTarget(null)}
        />
      )}

      {deletePackageTarget && (
        <ConfirmDeleteModal
          itemName={deletePackageTarget.name}
          warning={HISTORICAL_WARNING}
          onConfirm={handleDeletePackageConfirm}
          onCancel={() => setDeletePackageTarget(null)}
        />
      )}

      {showAddServiceModal && (
        <AdminServiceFormModal
          categories={serviceCategories}
          onSave={handleAddServiceSave}
          onCancel={() => setShowAddServiceModal(false)}
        />
      )}

      {editServiceTarget && (
        <AdminServiceFormModal
          categories={serviceCategories}
          initialService={editServiceTarget}
          onSave={handleEditServiceSave}
          onCancel={() => setEditServiceTarget(null)}
        />
      )}

      {deleteServiceTarget && (
        <ConfirmDeleteModal
          itemName={deleteServiceTarget.name}
          warning={SERVICE_HISTORICAL_WARNING}
          onConfirm={handleDeleteServiceConfirm}
          onCancel={() => setDeleteServiceTarget(null)}
        />
      )}
    </div>
  );
}
