"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Order, OrderStatus } from "../../../staff/(dashboard)/types";
import { paymentHint, paymentLabel, paymentTone, PAYMENT_TEXT_CLASS } from "../../../lib/paymentDisplay";
import CustomerAvatar from "../../admincom/CustomerAvatar";
import OrderDetailsModal from "../../admincom/OrderDetailsModal";

interface SalesTableProps {
  orders: Order[];
  loading?: boolean;
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

// Same compact table as the Admin's Laundry Monitoring: only the columns
// that fit; click an order for everything else (staff, laundry items,
// payment method) in the details window.
export default function SalesTable({ orders, loading }: SalesTableProps) {
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-3 px-4 sm:px-5 font-semibold">Customer</th>
              <th className="py-3 px-3 font-semibold">Date</th>
              <th className="py-3 px-3 font-semibold">Contact</th>
              <th className="py-3 px-3 font-semibold">Total</th>
              <th className="py-3 px-3 font-semibold">Status</th>
              <th className="py-3 px-3 font-semibold">Payment</th>
              <th className="py-3 pr-4 w-8" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr
                  key={order.id}
                  tabIndex={0}
                  onClick={() => setDetailsOrder(order)}
                  onKeyDown={(e) => {
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
                  <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                    <p className="text-gray-700">{order.date}</p>
                    <p className="text-xs text-gray-400">{order.time}</p>
                  </td>
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
                  {/* Payment status only — the method is in the details window. */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      title={paymentHint(order)}
                      className={`font-semibold ${
                        paymentTone(order) === "paid" ? "text-blue-600" : PAYMENT_TEXT_CLASS[paymentTone(order)]
                      }`}
                    >
                      {paymentLabel(order)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-300 group-hover:text-sky-500 transition-colors">
                    <ChevronRight size={18} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  No sales records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailsOrder && <OrderDetailsModal order={detailsOrder} onClose={() => setDetailsOrder(null)} />}
    </div>
  );
}
