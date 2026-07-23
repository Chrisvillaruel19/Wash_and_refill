"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

interface OrderCardProps {
  order: Order;
  onMoveBack: () => void;
  onMoveForward: () => void;
}

const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-orange-500",
  "In progress": "bg-blue-600",
  Ready: "bg-green-600",
  Claimed: "bg-gray-500",
};

const statusFlow: OrderStatus[] = ["Pending", "In progress", "Ready", "Claimed"];

export default function OrderCard({ order, onMoveBack, onMoveForward }: OrderCardProps) {
  const currentIndex = statusFlow.indexOf(order.status);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === statusFlow.length - 1;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-[160px]">
        <p className="font-bold text-gray-800">{order.customer}</p>
        <p className="text-sm text-gray-500">{order.contact}</p>
        <p className="text-sm text-gray-500">{order.time}</p>
        <p className="text-sm text-gray-500">{order.date}</p>
      </div>

      <div className="flex-1 min-w-[200px]">
        <p className="text-xs text-gray-400 mb-1">Service</p>
        {order.items && order.items.length > 0 ? (
          order.items.map((item, i) => (
            <p key={i} className="font-medium text-gray-800 text-sm">
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm text-gray-400">No items listed</p>
        )}
      </div>

      <div className="text-right">
        <p className="font-bold text-gray-800">
          Amount: ₱{order.amount.toFixed(2)}{" "}
          <span className={order.payStatus === "Paid" ? "text-blue-600" : "text-red-500"}>
            {order.payStatus.toUpperCase()}
          </span>
        </p>
      </div>

      <div className="text-center">
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
        </div>
      </div>
    </div>
  );
}