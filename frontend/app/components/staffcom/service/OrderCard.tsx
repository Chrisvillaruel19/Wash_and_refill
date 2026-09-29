"use client";

import { Order } from "../../../staff/(dashboard)/types";
import GroupedItemsList from "../GroupedItemsList";
import { getOrderActionState, primaryButtonClass, statusBadgeStyles } from "./orderActions";

interface OrderCardProps {
  order: Order;
  // Moves the order one step forward (Pending → In progress → Ready →
  // Claimed). The backend only allows forward, one-step moves.
  onAdvance: () => void;
  onCancel: () => void;
  onMarkAsPaid: () => void;
}

// Phone layout of one Services order — tablet/desktop use OrdersTable.
export default function OrderCard({ order, onAdvance, onCancel, onMarkAsPaid }: OrderCardProps) {
  const { canCancel, isUnpaid, needsPaymentToRelease, primary } = getOrderActionState(order);

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 break-words">{order.customer}</p>
          <p className="text-sm text-gray-500">{order.contact}</p>
          <p className="text-xs text-gray-400">
            {order.date} · {order.time}
            {order.staffName && ` · ${order.staffName}`}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-0.5 rounded-full text-xs font-semibold ${statusBadgeStyles[order.status]}`}
        >
          {order.status}
        </span>
      </div>

      <div className="mt-3">
        <GroupedItemsList items={order.items || []} itemClassName="font-medium text-gray-800 text-sm" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-bold text-gray-800">₱{order.amount.toFixed(2)}</p>
        <div className="flex items-center gap-2">
          {isUnpaid && !needsPaymentToRelease && (
            <button
              onClick={onMarkAsPaid}
              className="text-xs font-medium text-green-600 border border-green-500 rounded-lg px-3 py-1 hover:bg-green-50"
            >
              Mark as Paid
            </button>
          )}
          <PayBadge paid={order.payStatus === "Paid"} />
        </div>
      </div>

      {primary && (
        <button
          onClick={primary.kind === "collectPayment" ? onMarkAsPaid : onAdvance}
          className={`mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${primaryButtonClass(primary.kind)}`}
        >
          {primary.label}
        </button>
      )}
      {canCancel && (
        <button
          onClick={onCancel}
          className="mt-2 block mx-auto text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
        >
          Cancel order
        </button>
      )}
    </div>
  );
}

export function PayBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
        paid ? "text-blue-600 border-blue-300 bg-blue-50" : "text-red-500 border-red-300 bg-red-50"
      }`}
    >
      {paid ? "PAID" : "UNPAID"}
    </span>
  );
}
