"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCw, CheckCircle2, ClipboardCheck, Search } from "lucide-react";
import OrderCard from "../../../components/staffcom/service/OrderCard";
import ConfirmClaimModal from "../../../components/staffcom/service/ConfirmClaimModal";
import ConfirmCancelModal from "../../../components/staffcom/service/ConfirmCancelModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  cancelOrder,
} from "../../../lib/services/ordersApi.service";
import { Order, OrderStatus } from "../types";

const PAGE_SIZE = 6;

const statusFlow: OrderStatus[] = ["Pending", "In progress", "Ready", "Claimed"];

const filters: ("All" | OrderStatus)[] = [
  "All",
  "Pending",
  "In progress",
  "Ready",
  "Claimed",
  "Cancelled",
];

export default function ServicePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<"All" | OrderStatus>("All");
  const [search, setSearch] = useState("");
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  // GET /orders (list) omits line items to stay lean — populated per-order,
  // bounded to whatever page is currently visible, via GET /orders/:id.
  // Persists across refetches so items already fetched aren't re-requested.
  const [itemsByOrderId, setItemsByOrderId] = useState<Record<string, string[]>>({});

  async function loadOrders() {
    try {
      const data = await getOrders();
      setOrders(data);
      return data;
    } catch {
      setLoadError("Unable to load orders. Please try again.");
      return [];
    }
  }

  useEffect(() => {
    async function initialLoad() {
      await loadOrders();
      setLoading(false);
    }
    initialLoad();
  }, []);

  function changeStatus(orderId: string, direction: 1 | -1) {
    if (actionSubmitting) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const currentIndex = statusFlow.indexOf(order.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= statusFlow.length) return;

    const nextStatus = statusFlow[nextIndex];

    if (nextStatus === "Claimed") {
      setActionError("");
      setPendingClaimId(orderId);
      return;
    }

    runAction(() => updateOrderStatus(orderId, nextStatus));
  }

  async function runAction(action: () => Promise<void>) {
    setActionSubmitting(true);
    setActionError("");
    try {
      await action();
      await loadOrders();
      setPendingClaimId(null);
      setPendingCancelId(null);
    } catch {
      setActionError("Unable to update this order. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

  function confirmClaim() {
    if (!pendingClaimId) return;
    runAction(() => updateOrderStatus(pendingClaimId, "Claimed"));
  }

  function confirmCancel() {
    if (!pendingCancelId) return;
    runAction(() => cancelOrder(pendingCancelId));
  }

  const counts = {
    Pending: orders.filter((o) => o.status === "Pending").length,
    "In progress": orders.filter((o) => o.status === "In progress").length,
    Ready: orders.filter((o) => o.status === "Ready").length,
    Claimed: orders.filter((o) => o.status === "Claimed").length,
  };

  const filteredOrders = orders.filter((order) => {
  const matchesFilter =
    activeFilter === "All"
      ? order.status !== "Claimed" && order.status !== "Cancelled"
      : order.status === activeFilter;

  const matchesSearch =
    order.customer.toLowerCase().includes(search.toLowerCase()) ||
    order.contact.includes(search);

  return matchesFilter && matchesSearch;
});

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredOrders,
    PAGE_SIZE,
    `${activeFilter}-${search}`
  );

  useEffect(() => {
    const missingIds = paginatedItems.map((o) => o.id).filter((id) => !(id in itemsByOrderId));
    if (missingIds.length === 0) return;

    let cancelled = false;
    Promise.all(missingIds.map((id) => getOrderDetail(id))).then((details) => {
      if (cancelled) return;
      setItemsByOrderId((prev) => {
        const next = { ...prev };
        for (const detail of details) {
          next[detail.id] = detail.items ?? [];
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedItems]);

  const displayedItems = paginatedItems.map((order) => ({
    ...order,
    items: itemsByOrderId[order.id] ?? order.items,
  }));

  if (loading) {
    return <p className="text-gray-400 p-6">Loading orders...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Service Management</h1>

      {actionError && !pendingClaimId && !pendingCancelId && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Pending</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{counts.Pending}</p>
          </div>
          <Clock size={28} className="text-orange-500 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{counts["In progress"]}</p>
          </div>
          <RefreshCw size={28} className="text-blue-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Ready</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{counts.Ready}</p>
          </div>
          <CheckCircle2 size={28} className="text-green-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Claimed</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{counts.Claimed}</p>
          </div>
          <ClipboardCheck size={28} className="text-gray-700 shrink-0" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {filters.map((f) => (
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

        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="service-order-search"
            autoComplete="off"
            className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-4">
        {displayedItems.length > 0 ? (
          displayedItems.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onMoveBack={() => changeStatus(order.id, -1)}
              onMoveForward={() => changeStatus(order.id, 1)}
              onCancel={() => {
                setActionError("");
                setPendingCancelId(order.id);
              }}
            />
          ))
        ) : (
          <p className="text-gray-400 text-center py-10">No orders found.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {pendingClaimId && (
        <ConfirmClaimModal
          onConfirm={confirmClaim}
          onCancel={() => setPendingClaimId(null)}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}

      {pendingCancelId && (
        <ConfirmCancelModal
          onConfirm={confirmCancel}
          onCancel={() => setPendingCancelId(null)}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}
    </div>
  );
}