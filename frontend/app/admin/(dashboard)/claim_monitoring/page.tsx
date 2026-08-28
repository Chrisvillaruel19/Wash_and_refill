"use client";

import { useEffect, useState } from "react";
import { Clock, RefreshCw, CheckCircle2, Search } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import ConfirmReversePaymentModal from "../../../components/admincom/ConfirmReversePaymentModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";
import {
  getOrders,
  getOrdersPage,
  getOrderDetail,
  reverseOrderPayment,
} from "../../../lib/services/ordersApi.service";
import { getAdminDashboard } from "../../../lib/services/dashboard.service";
import { formatGroupedItems } from "../../../lib/groupItems";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

const PAGE_SIZE = 8;

type MonitoringFilter = "All" | "Claimed" | "Unclaimed";

const filters: MonitoringFilter[] = ["All", "Claimed", "Unclaimed"];

const statusStyles: Record<OrderStatus, string> = {
  Pending: "text-orange-500",
  "In progress": "text-blue-600",
  Ready: "text-purple-600",
  Claimed: "text-green-600",
  Cancelled: "text-red-500",
};

export default function ClaimMonitoringPage() {
  const [activeFilter, setActiveFilter] = useState<MonitoringFilter>("All");
  const [searchDate, setSearchDate] = useState("");
  const [error, setError] = useState("");
  // GET /orders (list) omits line items to stay lean — populated per-order,
  // bounded to whatever page is currently visible, via GET /orders/:id.
  // Same pattern as Staff Service/Sales.
  const [itemsByOrderId, setItemsByOrderId] = useState<Record<string, string[]>>({});
  const [pendingReverseId, setPendingReverseId] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  // Bumped after a payment reversal to force a refetch of whichever data
  // source (server page or the lazily-loaded full set below) is active.
  const [reloadKey, setReloadKey] = useState(0);

  // All-time Pending/In Progress/Claimed counts — sourced from the existing
  // Admin Dashboard endpoint (orderStatusCounts) instead of computing them
  // from a full order fetch. Backend-authoritative, and means the stat
  // cards no longer require fetching every order just to count three numbers.
  const [statusCounts, setStatusCounts] = useState({ pending: 0, inProgress: 0, ready: 0, claimed: 0 });

  useEffect(() => {
    getAdminDashboard()
      .then((d) => setStatusCounts(d.statusCounts))
      .catch(() => {
        // Non-critical — the table below still works without the stat cards.
      });
  }, [reloadKey]);

  const isFiltering = activeFilter !== "All" || searchDate !== "";

  // Default (unfiltered) browsing — real server-side pagination, one
  // request per page turn, verifiable in the network tab.
  const {
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverTotalPages,
    items: serverItems,
    loading: serverLoading,
  } = useServerPage(getOrdersPage, PAGE_SIZE, !isFiltering, reloadKey);

  // The filter tabs and date search need to reach every historical order,
  // not just whatever page is currently loaded — the backend's page/pageSize
  // support has no filter/search params to push this server-side. Lazily
  // fetched only once a filter or search is actually used, and cached for
  // the rest of this filtered session.
  const [fullOrders, setFullOrders] = useState<Order[] | null>(null);
  const [fullOrdersLoading, setFullOrdersLoading] = useState(false);

  useEffect(() => {
    if (!isFiltering) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullOrdersLoading(true);
    getOrders()
      .then((data) => {
        if (!cancelled) setFullOrders(data);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load orders. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setFullOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFiltering, reloadKey]);

  const filteredOrders = (fullOrders ?? []).filter((order) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Claimed" && order.status === "Claimed") ||
      (activeFilter === "Unclaimed" &&
        order.status !== "Claimed" &&
        order.status !== "Cancelled");

    const matchesDate = order.date.includes(searchDate);

    return matchesFilter && matchesDate;
  });

  const {
    page: clientPage,
    setPage: setClientPage,
    totalPages: clientTotalPages,
    paginatedItems: clientPaginatedItems,
  } = usePagination(filteredOrders, PAGE_SIZE, `${activeFilter}-${searchDate}`);

  // Unified view regardless of which mode is active, so the render below
  // (and the per-order line-item lookup effect) doesn't need to know which.
  const page = isFiltering ? clientPage : serverPage;
  const setPage = isFiltering ? setClientPage : setServerPage;
  const totalPages = isFiltering ? clientTotalPages : serverTotalPages;
  const paginatedItems = isFiltering ? clientPaginatedItems : serverItems;
  const tableLoading = isFiltering ? fullOrdersLoading : serverLoading;

  async function confirmReversePayment() {
    if (!pendingReverseId) return;
    setActionSubmitting(true);
    setActionError("");
    try {
      await reverseOrderPayment(pendingReverseId);
      setReloadKey((k) => k + 1);
      setPendingReverseId(null);
    } catch {
      setActionError("Unable to reverse this payment. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

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

  if (error) {
    return <p className="text-red-500 p-6">{error}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <AdminStatCard
          label="Total pending"
          value={statusCounts.pending}
          icon={Clock}
          iconColor="text-orange-500 bg-orange-100"
        />
        <AdminStatCard
          label="Total In Progress"
          value={statusCounts.inProgress}
          icon={RefreshCw}
          iconColor="text-blue-600 bg-blue-100"
        />
        <AdminStatCard
          label="Total claimed (all-time)"
          value={statusCounts.claimed}
          icon={CheckCircle2}
          iconColor="text-green-600 bg-green-100"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
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

        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            name="monitoring-search-date"
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
                <th className="p-3 sm:p-4 whitespace-nowrap">Customer</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Date</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Contact</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Staff</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Laundry Items</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Total</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Payment</th>
              </tr>
            </thead>
            <tbody className={tableLoading ? "opacity-50" : undefined}>
              {displayedItems.length > 0 ? (
                displayedItems.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.customer}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.date}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.contact}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.staffName || "N/A"}</td>
                    <td
                      className="p-3 sm:p-4 font-medium max-w-[200px] truncate text-gray-900"
                      title={order.items && order.items.length > 0 ? formatGroupedItems(order.items) : undefined}
                    >
                      {order.items && order.items.length > 0
                        ? formatGroupedItems(order.items)
                        : "—"}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">₱{order.amount.toFixed(2)}</td>
                    <td className={`p-3 sm:p-4 font-semibold whitespace-nowrap ${statusStyles[order.status]}`}>
                      {order.status}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${order.payStatus === "Paid" ? "text-blue-600" : "text-red-500"}`}
                      >
                        {order.payStatus === "Paid" ? "Paid" : "Unpaid"}
                      </span>
                      {order.payStatus === "Paid" && (
                        <button
                          onClick={() => {
                            setActionError("");
                            setPendingReverseId(order.id);
                          }}
                          className="ml-3 text-xs font-medium text-red-500 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-50"
                        >
                          Reverse Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {pendingReverseId && (
        <ConfirmReversePaymentModal
          onConfirm={confirmReversePayment}
          onCancel={() => setPendingReverseId(null)}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}
    </div>
  );
}
