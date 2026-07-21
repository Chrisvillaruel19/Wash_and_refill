"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCw, CheckCircle2, ClipboardCheck, Search } from "lucide-react";
import OrderCard from "../../../components/staffcom/service/OrderCard";
import ConfirmClaimModal from "../../../components/staffcom/service/ConfirmClaimModal";
import { getStoredOrders, updateOrderStatus } from "../localOrders";
import { Order, OrderStatus } from "../types";

const statusFlow: OrderStatus[] = ["Pending", "In progress", "Ready", "Claimed"];

const filters: ("All" | OrderStatus)[] = ["All", "Pending", "In progress", "Ready", "Claimed"];

export default function ServicePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<"All" | OrderStatus>("All");
  const [search, setSearch] = useState("");
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setOrders(getStoredOrders());
}, []);

  function changeStatus(orderId: string, direction: 1 | -1) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const currentIndex = statusFlow.indexOf(order.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= statusFlow.length) return;

    const nextStatus = statusFlow[nextIndex];

    if (nextStatus === "Claimed") {
      setPendingClaimId(orderId);
      return;
    }

    const updated = updateOrderStatus(orderId, nextStatus);
    setOrders(updated);
  }

  function confirmClaim() {
    if (!pendingClaimId) return;
    const updated = updateOrderStatus(pendingClaimId, "Claimed");
    setOrders(updated);
    setPendingClaimId(null);
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
      ? order.status !== "Claimed"
      : order.status === activeFilter;

  const matchesSearch =
    order.customer.toLowerCase().includes(search.toLowerCase()) ||
    order.contact.includes(search);

  return matchesFilter && matchesSearch;
});

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Service Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Pending</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{counts.Pending}</p>
          </div>
          <Clock size={28} className="text-orange-500 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{counts["In progress"]}</p>
          </div>
          <RefreshCw size={28} className="text-blue-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Ready</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{counts.Ready}</p>
          </div>
          <CheckCircle2 size={28} className="text-green-600 shrink-0" />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between">
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
            className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onMoveBack={() => changeStatus(order.id, -1)}
              onMoveForward={() => changeStatus(order.id, 1)}
            />
          ))
        ) : (
          <p className="text-gray-400 text-center py-10">No orders found.</p>
        )}
      </div>

      {pendingClaimId && (
        <ConfirmClaimModal
          onConfirm={confirmClaim}
          onCancel={() => setPendingClaimId(null)}
        />
      )}
    </div>
  );
}