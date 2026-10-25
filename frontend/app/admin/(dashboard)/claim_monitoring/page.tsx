"use client";

import { useEffect, useState } from "react";
import { Clock, RefreshCw, CheckCircle2, Search, Download, ChevronRight } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import RefundOrderModal, { RefundFormData } from "../../../components/admincom/RefundOrderModal";
import OrderDetailsModal from "../../../components/admincom/OrderDetailsModal";
import CustomerAvatar from "../../../components/admincom/CustomerAvatar";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";
import {
  getOrders,
  getOrdersPage,
  getOrderDetail,
  refundOrder,
} from "../../../lib/services/ordersApi.service";
import { getAdminDashboard } from "../../../lib/services/dashboard.service";
import { exportOrdersToExcel } from "../../../lib/exportOrdersToExcel";
import { ApiError } from "../../../lib/apiClient";
import { paymentLabel, paymentTone, PAYMENT_TEXT_CLASS } from "../../../lib/paymentDisplay";
import { useAutoRefresh } from "../../../lib/useAutoRefresh";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

const PAGE_SIZE = 8;

// Claim Monitoring tracks drop-off laundry only — self-service orders are
// complete at checkout and only belong in Sales.
const getDropOffOrdersPage = (page: number, pageSize: number) => getOrdersPage(page, pageSize, false, true);

type MonitoringFilter = "All" | "Claimed" | "Unclaimed";

const filters: MonitoringFilter[] = ["All", "Claimed", "Unclaimed"];

function matchesMonitoringFilter(order: Order, filter: MonitoringFilter, searchText: string) {
  const matchesFilter =
    filter === "All" ||
    (filter === "Claimed" && order.status === "Claimed") ||
    (filter === "Unclaimed" && order.status !== "Claimed" && order.status !== "Cancelled");

  if (!matchesFilter) return false;
  // One box searches everything the table shows: customer name, contact
  // number, date and staff — case-insensitive, spaces around ignored.
  const term = searchText.trim().toLowerCase();
  if (!term) return true;
  return [order.customer, order.contact, order.date, order.staffName ?? ""].some((field) =>
    field.toLowerCase().includes(term)
  );
}

// Only the Admin refunds, and only cancelled (full amount) or claimed
// (partial or full) paid orders, until nothing's left.
function canRefund(order: Order) {
  return order.payStatus === "Paid" && (order.status === "Cancelled" || order.status === "Claimed");
}

// Status pills — same colors as the order details window.
const statusStyles: Record<OrderStatus, string> = {
  Pending: "text-orange-700 border-orange-200 bg-orange-50",
  "In progress": "text-blue-700 border-blue-200 bg-blue-50",
  Ready: "text-purple-700 border-purple-200 bg-purple-50",
  Claimed: "text-green-700 border-green-200 bg-green-50",
  Cancelled: "text-red-700 border-red-200 bg-red-50",
};

// "09171234567" → "0917 123 4567"; anything else as-is.
function formatPhone(phone: string) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

export default function ClaimMonitoringPage() {
  const [activeFilter, setActiveFilter] = useState<MonitoringFilter>("All");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  // GET /orders (list) omits line items to stay lean — populated per-order,
  // bounded to whatever page is currently visible, via GET /orders/:id.
  // Same pattern as Staff Service/Sales.
  const [itemsByOrderId, setItemsByOrderId] = useState<Record<string, string[]>>({});
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  // The order whose full details ("View more") are open.
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  // Bumped after a refund to force a refetch of whichever data
  // source (server page or the lazily-loaded full set below) is active.
  const [reloadKey, setReloadKey] = useState(0);

  // New orders, cancellations and claims from staff show up every 30s and
  // when returning to the tab — skipped while the refund form is open so
  // the list doesn't shift underneath it.
  useAutoRefresh(() => {
    if (!refundTarget) setReloadKey((k) => k + 1);
  });

  // Pending/In Progress counts are all-time (current backlog); Claimed is
  // shop-wide but scoped to the current business day — all three sourced
  // from the existing Admin Dashboard endpoint (orderStatusCounts) instead
  // of computing them from a full order fetch. Backend-authoritative, and
  // means the stat cards no longer require fetching every order just to
  // count three numbers.
  const [statusCounts, setStatusCounts] = useState({ pending: 0, inProgress: 0, ready: 0, claimed: 0 });

  useEffect(() => {
    getAdminDashboard()
      .then((d) => setStatusCounts(d.statusCounts))
      .catch(() => {
        // Non-critical — the table below still works without the stat cards.
      });
  }, [reloadKey]);

  const isFiltering = activeFilter !== "All" || searchText !== "";

  // Default (unfiltered) browsing — real server-side pagination, one
  // request per page turn, verifiable in the network tab.
  const {
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverTotalPages,
    items: serverItems,
    loading: serverLoading,
  } = useServerPage(getDropOffOrdersPage, PAGE_SIZE, !isFiltering, reloadKey);

  // The filter tabs and search need to reach every historical order,
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
    getOrders({ excludeSelfService: true })
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

  const filteredOrders = (fullOrders ?? []).filter((order) =>
    matchesMonitoringFilter(order, activeFilter, searchText)
  );

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Exports whatever the active tab + search currently match ("All"
  // with no search = every order). Always a fresh fetch with line items
  // included, independent of the table's paging/cache.
  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const orders = await getOrders({ includeItems: true, excludeSelfService: true });
      const matching = orders.filter((order) => matchesMonitoringFilter(order, activeFilter, searchText));
      const today = new Date().toISOString().slice(0, 10);
      await exportOrdersToExcel(matching, `customer-records-${activeFilter.toLowerCase()}-${today}.xlsx`);
    } catch {
      setExportError("Unable to export orders. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const {
    page: clientPage,
    setPage: setClientPage,
    totalPages: clientTotalPages,
    paginatedItems: clientPaginatedItems,
  } = usePagination(filteredOrders, PAGE_SIZE, `${activeFilter}-${searchText}`);

  // Unified view regardless of which mode is active, so the render below
  // (and the per-order line-item lookup effect) doesn't need to know which.
  const page = isFiltering ? clientPage : serverPage;
  const setPage = isFiltering ? setClientPage : setServerPage;
  const totalPages = isFiltering ? clientTotalPages : serverTotalPages;
  const paginatedItems = isFiltering ? clientPaginatedItems : serverItems;
  const tableLoading = isFiltering ? fullOrdersLoading : serverLoading;

  async function confirmRefund(data: RefundFormData) {
    if (!refundTarget) return;
    setActionSubmitting(true);
    setActionError("");
    try {
      await refundOrder(refundTarget.id, data);
      setReloadKey((k) => k + 1);
      setRefundTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to refund this order. Please try again.");
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
          label="Total claimed today"
          value={statusCounts.claimed}
          icon={CheckCircle2}
          iconColor="text-green-600 bg-green-100"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Card header like Customers: filters and search, export on the right. */}
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                    activeFilter === f
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search name, contact, date or staff"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                name="monitoring-search"
                aria-label="Search orders by customer name, contact number, date or staff"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-3 bg-white text-gray-900 placeholder:text-gray-500 text-sm"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="sm:ml-auto inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
          </div>
        </div>

        {exportError && (
          <p className="m-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg py-2 px-3">{exportError}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* Only the columns that fit without sideways scrolling; click an
                order to see everything (staff, laundry items, payment method). */}
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 sm:px-5 font-semibold">Customer</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Contact</th>
                <th className="py-3 px-3 font-semibold">Total</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Payment</th>
                <th className="py-3 px-3 font-semibold">Action</th>
                <th className="py-3 pr-4 w-8" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className={`transition-opacity ${tableLoading ? "opacity-50" : ""}`}>
              {displayedItems.length > 0 ? (
                displayedItems.map((order) => (
                  <tr
                    key={order.id}
                    tabIndex={0}
                    onClick={() => setDetailsOrder(order)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailsOrder(order);
                      }
                    }}
                    className="group border-t border-gray-100 cursor-pointer transition-colors hover:bg-sky-50/70 focus:outline-none focus-visible:bg-sky-50"
                  >
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <CustomerAvatar name={order.customer} seed={`${order.customer}${order.contact}`} />
                        <span className="truncate font-semibold text-gray-900">{order.customer}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-gray-700">{order.date}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-gray-700 tabular-nums">
                      {order.contact ? formatPhone(order.contact) : <span className="text-gray-400">No number</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-900 tabular-nums">
                      ₱{order.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          paymentTone(order) === "paid" ? "text-blue-600" : PAYMENT_TEXT_CLASS[paymentTone(order)]
                        }`}
                      >
                        {paymentLabel(order)}
                      </span>
                    </td>
                    {/* stopPropagation: Refund opens the refund window, not the details. */}
                    <td className="py-3 px-3 whitespace-nowrap cursor-default" onClick={(e) => e.stopPropagation()}>
                      {canRefund(order) ? (
                        <button
                          onClick={() => {
                            setActionError("");
                            setRefundTarget(order);
                          }}
                          className="text-xs font-medium text-red-500 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-50 cursor-pointer"
                        >
                          Refund
                        </button>
                      ) : (order.refundToGive ?? 0) === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : null}
                      {/* An approved cash refund the staff on duty hasn't handed over yet. */}
                      {(order.refundToGive ?? 0) > 0 && (
                        <span className="block mt-1 text-xs text-amber-700">
                          Staff to give ₱{(order.refundToGive ?? 0).toFixed(2)} cash
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-300 group-hover:text-sky-500 transition-colors">
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {detailsOrder && (
        <OrderDetailsModal
          order={detailsOrder}
          canRefund={canRefund(detailsOrder)}
          onRefund={() => {
            setActionError("");
            setRefundTarget(detailsOrder);
            setDetailsOrder(null);
          }}
          onClose={() => setDetailsOrder(null)}
        />
      )}

      {refundTarget && (
        <RefundOrderModal
          order={refundTarget}
          onConfirm={confirmRefund}
          onCancel={() => setRefundTarget(null)}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}
    </div>
  );
}
