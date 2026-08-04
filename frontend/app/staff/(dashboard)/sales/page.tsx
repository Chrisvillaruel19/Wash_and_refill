"use client";

import { useEffect, useState } from "react";
import SalesStats from "../../../components/staffcom/sales/SalesStats";
import SalesFilters, { SalesFilter } from "../../../components/staffcom/sales/SalesFilters";
import SalesTable from "../../../components/staffcom/sales/SalesTable";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { getStoredOrders } from "../../../lib/services/orders.service";
import { getStoredPackages } from "../../../lib/services/packages.service";
import { getDropOffSummary, getAverageOrderValue } from "../../../lib/services/stats.service";
import { Order } from "../types";
import { Package } from "../neworder/types";

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
  const [packages, setPackages] = useState<Package[]>([]);
  const [activeFilter, setActiveFilter] = useState<SalesFilter>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrders(getStoredOrders());
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackages(getStoredPackages());
  }, []);

  const totalPending = orders.filter((o) => o.status === "Pending").length;
  const totalInProgress = orders.filter((o) => o.status === "In progress").length;
  const totalClaimed = orders.filter((o) => o.status === "Claimed").length;

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

  const averageOrderValue = getAverageOrderValue(filteredOrders);
  const packageBreakdown = getDropOffSummary(filteredOrders, packages);

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredOrders,
    PAGE_SIZE,
    `${activeFilter}-${dateFrom}-${dateTo}`
  );

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

      {packageBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Package Sales Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-700 border-b bg-gray-50">
                  <th className="p-2 whitespace-nowrap">Package</th>
                  <th className="p-2 whitespace-nowrap">Price</th>
                  <th className="p-2 whitespace-nowrap">Orders</th>
                  <th className="p-2 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {packageBreakdown.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.price}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.totalOrders}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SalesTable orders={paginatedItems} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
