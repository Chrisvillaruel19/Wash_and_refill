"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import CardHeader from "../../admincom/dashboard/CardHeader";
import { peso } from "../../admincom/dashboard/format";
import { statusBadgeStyles } from "../service/orderActions";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

// `orders` is now the 20 most recent orders (a single bounded server page,
// not the full history) — the dashboard widget's stated purpose is "recent
// orders," and full-history search here was an accidental side effect of
// the old full-fetch, not an intentional feature. The filter/search below
// only searches within that recent page; browsing/searching full order
// history belongs on Sales or Service, which still fetch everything.
interface OrdersTableProps {
  orders: Order[];
}

const RECENT_LIMIT = 5;

const filters: ("All" | OrderStatus)[] = ["All", "Pending", "In progress", "Ready", "Claimed"];

export default function OrdersTable({ orders }: OrdersTableProps) {
  const [activeFilter, setActiveFilter] = useState<"All" | OrderStatus>("All");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter = activeFilter === "All" || order.status === activeFilter;
      const matchesSearch =
        order.customer.toLowerCase().includes(search.toLowerCase()) ||
        order.contact.includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, search]);

  const isFiltering = activeFilter !== "All" || search !== "";
  const displayedOrders = isFiltering ? filteredOrders : filteredOrders.slice(0, RECENT_LIMIT);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <CardHeader title="Recent orders" linkHref="/staff/service" linkLabel="View all in Service" />
      <p className="text-sm text-gray-500 mb-4">
        {isFiltering
          ? `${displayedOrders.length} matching order${displayedOrders.length === 1 ? "" : "s"}`
          : `${displayedOrders.length} most recent order${displayedOrders.length === 1 ? "" : "s"}`}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              aria-pressed={activeFilter === f}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors ${
                activeFilter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="dashboard-order-search"
            autoComplete="off"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600 text-xs uppercase tracking-wide">
              <th className="p-3 text-left font-semibold">Customer</th>
              <th className="p-3 text-left font-semibold">Contact</th>
              <th className="p-3 text-left font-semibold">Date</th>
              <th className="p-3 text-right font-semibold">Amount</th>
              <th className="p-3 text-left font-semibold">Payment</th>
              <th className="p-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length > 0 ? (
              displayedOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{order.customer}</td>
                  <td className="p-3 text-gray-600">{order.contact}</td>
                  <td className="p-3 text-gray-600">
                    {order.date} <span className="text-gray-400">· {order.time}</span>
                  </td>
                  <td className="p-3 text-right text-gray-900 font-medium tabular-nums">{peso(order.amount)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-semibold ${
                        order.payStatus === "Paid" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {order.payStatus === "Paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${statusBadgeStyles[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
