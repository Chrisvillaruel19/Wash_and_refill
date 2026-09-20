"use client";

import { useEffect, useState } from "react";
import SalesStats from "../../../components/staffcom/sales/SalesStats";
import SalesFilters, { SalesFilter } from "../../../components/staffcom/sales/SalesFilters";
import SalesTable from "../../../components/staffcom/sales/SalesTable";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";
import { getOrders, getOrdersPage, getOrderDetail, getSalesBreakdown, SalesBreakdownRow } from "../../../lib/services/ordersApi.service";
import { Order } from "../types";

const PAGE_SIZE = 8;

// Local-time YYYY-MM-DD, matching what <input type="date"> produces —
// deliberately not toISOString() (UTC) or a locale string (ambiguous format).
function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<SalesFilter>("All");
  // Default view is today's relevant sales, not the entire all-time,
  // all-staff order history — same local-calendar-date convention as
  // toDateInputValue below, just applied as the initial value instead of
  // only on user input. Clearing either field (existing control, unchanged)
  // still reaches the full history exactly as before.
  const [dateFrom, setDateFrom] = useState(() => toDateInputValue(new Date()));
  const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // GET /orders (list) omits line items to stay lean — populated per-order,
  // bounded to whatever page is currently visible, via GET /orders/:id.
  // Same pattern as Staff Service's itemsByOrderId. Persists across refetches
  // so items already fetched aren't re-requested.
  const [itemsByOrderId, setItemsByOrderId] = useState<Record<string, string[]>>({});
  // Real per-order-detail breakdown from the backend (GET /orders/sales-
  // breakdown), scoped to whatever date range is currently selected — not
  // computed from `orders` above, which never carries line items.
  const [packageBreakdown, setPackageBreakdown] = useState<SalesBreakdownRow[]>([]);
  const [breakdownError, setBreakdownError] = useState("");
  // Authoritative PAID + non-CANCELLED + paymentDate totals for whatever
  // dateFrom/dateTo is currently selected — same backend call as the
  // package breakdown above, just reading its two extra fields. Never
  // derived from `filteredOrders` (createdAt-scoped, order-record browsing)
  // — those are two different questions (see comment on the effect below).
  const [salesTotals, setSalesTotals] = useState({ totalPaidAmount: 0, paidOrderCount: 0 });

  useEffect(() => {
    async function load() {
      try {
        const ordersData = await getOrders();
        setOrders(ordersData);
      } catch {
        setLoadError("Unable to load sales data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSalesBreakdown({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((data) => {
        if (cancelled) return;
        setPackageBreakdown(data.packageBreakdown);
        setSalesTotals({ totalPaidAmount: data.totalPaidAmount, paidOrderCount: data.paidOrderCount });
      })
      .catch(() => {
        if (!cancelled) setBreakdownError("Unable to load package sales breakdown.");
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const totalPending = orders.filter((o) => o.status === "Pending").length;
  const totalInProgress = orders.filter((o) => o.status === "In progress").length;
  const totalClaimed = orders.filter((o) => o.status === "Claimed").length;

  const isFiltering = activeFilter !== "All" || dateFrom !== "" || dateTo !== "";

  // Default (unfiltered) table browsing — real server-side pagination, one
  // request per page turn. The stat cards/average/drop-off breakdown above
  // still need the complete `orders` fetch regardless of filter state (see
  // load() above) — there's no backend endpoint for "average order value"
  // or per-package drop-off totals, so that fetch can't be eliminated here.
  // This only decouples the raw table listing from it once unfiltered.
  const {
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverTotalPages,
    items: serverItems,
    loading: serverLoading,
  } = useServerPage(getOrdersPage, PAGE_SIZE, !isFiltering);

  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Claimed" && order.status === "Claimed") ||
      (activeFilter === "Unclaimed" &&
        order.status !== "Claimed" &&
        order.status !== "Cancelled");

    // No range selected ("All") shows everything, including orders from
    // before createdAt existed. Once a range is set, an order with no
    // createdAt can't be reliably placed in it, so it's excluded rather
    // than guessed at — same rule Shift Handover uses for shift scoping.
    const matchesDateRange = (() => {
      if (!dateFrom && !dateTo) return true;
      if (!order.createdAt) return false;
      const orderDate = toDateInputValue(new Date(order.createdAt));
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    })();

    return matchesFilter && matchesDateRange;
  });

  // Deliberately NOT getAverageOrderValue(filteredOrders): filteredOrders is
  // scoped by createdAt (order-record browsing, preserved as-is above), but
  // "Sales" is defined by paymentDate — an order created yesterday and paid
  // today is today's sale but wouldn't be in a createdAt-"today" filter, and
  // vice versa. salesTotals (from the same date range) is the correct source.
  const averageOrderValue =
    salesTotals.paidOrderCount > 0 ? salesTotals.totalPaidAmount / salesTotals.paidOrderCount : 0;

  const {
    page: clientPage,
    setPage: setClientPage,
    totalPages: clientTotalPages,
    paginatedItems: clientPaginatedItems,
  } = usePagination(filteredOrders, PAGE_SIZE, `${activeFilter}-${dateFrom}-${dateTo}`);

  // Unified view: real server pages while unfiltered, the already-loaded
  // (for the stats above) full set paginated client-side once filtered.
  const page = isFiltering ? clientPage : serverPage;
  const setPage = isFiltering ? setClientPage : setServerPage;
  const totalPages = isFiltering ? clientTotalPages : serverTotalPages;
  const paginatedItems = isFiltering ? clientPaginatedItems : serverItems;
  const tableLoading = !isFiltering && serverLoading;

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
    return <p className="text-gray-400 p-6">Loading sales data...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <SalesStats
        totalPending={totalPending}
        totalInProgress={totalInProgress}
        totalClaimed={totalClaimed}
        averageOrderValue={averageOrderValue}
      />
      <SalesFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Package Sales Breakdown</h2>
        {breakdownError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg py-2 px-3 mb-4">
            {breakdownError}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Package</th>
                <th className="p-2 whitespace-nowrap">Qty Sold</th>
                <th className="p-2 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {packageBreakdown.length > 0 ? (
                packageBreakdown.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.totalQuantity}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No drop-off orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SalesTable orders={displayedItems} loading={tableLoading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
