"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

interface OrdersTableProps {
  orders: Order[];
}

const filters: ("All" | OrderStatus)[] = ["All", "Pending", "In progress", "Ready", "Claimed"];

const statusStyles: Record<OrderStatus, string> = {
  Pending: "text-orange-500",
  "In progress": "text-blue-600",
  Ready: "text-green-600",
  Claimed: "text-gray-500",
};

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

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
    <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeFilter === f
                  ? "bg-sky-600 text-white border-sky-600"
                  : "text-sky-600 border-sky-600 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

       <div className="relative w-full sm:w-auto">
    <Search
      size={16}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
    />
    <input
      type="text"
      placeholder="Search name or Contact"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      name="dashboard-order-search"
      autoComplete="off"
      className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
    />
</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Contact</th>
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">pay_status</th>
              <th className="pb-3">status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 text-gray-900">{order.customer}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.contact}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.time}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.date}</td>
                  <td className="py-3 pr-4 text-gray-900">₱{order.amount.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.payStatus}</td>
                  <td className={`py-3 font-medium ${statusStyles[order.status]}`}>
                    {order.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
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