"use client";

import { Order } from "../../../staff/(dashboard)/types";
import GroupedItemsList from "../GroupedItemsList";
import { PayBadge } from "./OrderCard";
import { cancelledRefundAction } from "../../../lib/paymentDisplay";
import { getOrderActionState, primaryButtonClass, statusBadgeStyles } from "./orderActions";

interface OrdersTableProps {
  orders: Order[];
  onAdvance: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onMarkAsPaid: (orderId: string) => void;
}

// Tablet/desktop layout of the Services queue — phones use OrderCard.
export default function OrdersTable({ orders, onAdvance, onCancel, onMarkAsPaid }: OrdersTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="p-3 font-semibold">Customer</th>
            <th className="p-3 font-semibold">Items</th>
            <th className="p-3 font-semibold text-right">Amount</th>
            <th className="p-3 font-semibold text-center">Status</th>
            <th className="p-3 font-semibold text-center w-[190px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const { canCancel, isUnpaid, needsPaymentToRelease, primary } = getOrderActionState(order);
            const refundAction = cancelledRefundAction(order);
            return (
              <tr key={order.id} className="border-b border-gray-100 last:border-0 align-top hover:bg-gray-50/60">
                <td className="p-3">
                  <p className="font-semibold text-gray-900 break-words">{order.customer}</p>
                  <p className="text-gray-500">{order.contact}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.date} · {order.time}
                  </p>
                  {order.staffName && <p className="text-xs text-gray-400">by {order.staffName}</p>}
                </td>

                <td className="p-3">
                  <GroupedItemsList items={order.items || []} itemClassName="text-gray-800" />
                </td>

                <td className="p-3 text-right whitespace-nowrap">
                  <p className="font-bold text-gray-900">₱{order.amount.toFixed(2)}</p>
                  <div className="mt-1">
                    <PayBadge order={order} />
                  </div>
                  {isUnpaid && !needsPaymentToRelease && (
                    <button
                      onClick={() => onMarkAsPaid(order.id)}
                      className="mt-1.5 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                    >
                      Mark as Paid
                    </button>
                  )}
                </td>

                <td className="p-3 text-center">
                  <span
                    className={`inline-block whitespace-nowrap px-3 py-0.5 rounded-full text-xs font-semibold ${statusBadgeStyles[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>

                <td className="p-3 text-center">
                  {primary ? (
                    <button
                      onClick={() =>
                        primary.kind === "collectPayment" ? onMarkAsPaid(order.id) : onAdvance(order.id)
                      }
                      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white whitespace-nowrap ${primaryButtonClass(primary.kind)}`}
                    >
                      {primary.label}
                    </button>
                  ) : refundAction ? (
                    <p
                      className={`text-xs font-medium leading-snug ${
                        refundAction.tone === "done" ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      {refundAction.text}
                    </p>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => onCancel(order.id)}
                      className="mt-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                    >
                      Cancel order
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
