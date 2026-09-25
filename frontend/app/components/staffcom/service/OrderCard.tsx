"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";
import GroupedItemsList from "../GroupedItemsList";

interface OrderCardProps {
  order: Order;
  onMoveBack: () => void;
  onMoveForward: () => void;
  onCancel: () => void;
  onMarkAsPaid: () => void;
}

const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-orange-500",
  "In progress": "bg-blue-600",
  Ready: "bg-green-600",
  Claimed: "bg-gray-500",
  Cancelled: "bg-red-500",
};

const statusFlow: OrderStatus[] = ["Pending", "In progress", "Ready", "Claimed"];

export default function OrderCard({
  order,
  onMoveBack,
  onMoveForward,
  onCancel,
  onMarkAsPaid,
}: OrderCardProps) {
  const currentIndex = statusFlow.indexOf(order.status);
  const isTerminal = order.status === "Claimed" || order.status === "Cancelled";
  const isFirst = isTerminal || currentIndex === 0;
  const isLast = isTerminal || currentIndex === statusFlow.length - 1;
  const canCancel = order.status === "Pending" || order.status === "In progress" || order.status === "Ready";
  const canMarkAsPaid = order.payStatus === "UnPaid" && order.status !== "Cancelled";

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_minmax(170px,0.9fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <p className="font-bold text-gray-800 truncate" title={order.customer}>
          {order.customer}
        </p>
        <p className="text-sm text-gray-500 truncate" title={order.contact}>
          {order.contact}
        </p>
        <p className="text-sm text-gray-500">{order.time}</p>
        <p className="text-sm text-gray-500">{order.date}</p>
        {order.staffName && (
          <p className="text-xs text-gray-400 mt-1">Created by: {order.staffName}</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-1">Service</p>
        <GroupedItemsList
          items={order.items || []}
          itemClassName="font-medium text-gray-800 text-sm"
        />
      </div>

      <div className="min-w-0 lg:border-l lg:border-gray-100 lg:pl-4">
        <p className="text-xs text-gray-400 mb-1">Payment</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-gray-800">₱{order.amount.toFixed(2)}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              order.payStatus === "Paid"
                ? "border-blue-200 bg-blue-50 text-blue-600"
                : "border-red-200 bg-red-50 text-red-500"
            }`}
          >
            {order.payStatus.toUpperCase()}
          </span>
        </div>
        {canMarkAsPaid && (
          <button
            onClick={onMarkAsPaid}
            className="mt-2 w-full sm:w-auto text-xs font-medium text-green-600 border border-green-500 rounded-lg px-3 py-1.5 hover:bg-green-50"
          >
            Mark as Paid
          </button>
        )}
      </div>

      <div className="text-left lg:text-center lg:justify-self-end">
        <p className="text-sm text-gray-500 mb-1">Status</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onMoveBack}
            disabled={isFirst}
            className="border border-gray-300 rounded-lg p-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
          >
            <ArrowLeft size={16} />
          </button>

          <span
            className={`${statusStyles[order.status]} text-white font-semibold px-4 py-2 rounded-lg text-sm`}
          >
            {order.status}
          </span>

          <button
            onClick={onMoveForward}
            disabled={isLast}
            className="border border-gray-300 rounded-lg p-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
          >
            <ArrowRight size={16} />
          </button>

          {canCancel && (
            <button
              onClick={onCancel}
              title="Cancel order"
              className="border border-red-300 rounded-lg p-2 hover:bg-red-50 text-red-500"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}