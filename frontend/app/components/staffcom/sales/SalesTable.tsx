import { Order, OrderStatus } from "../../../staff/(dashboard)/types";
import { formatGroupedItems } from "../../../lib/groupItems";
import { paymentHint, paymentLabel, paymentTone, PAYMENT_BADGE_CLASS } from "../../../lib/paymentDisplay";

interface SalesTableProps {
  orders: Order[];
  loading?: boolean;
}

// Same pill shape as the payment badge, so the two columns read alike.
const statusStyles: Record<OrderStatus, string> = {
  Pending: "text-orange-700 border-orange-200 bg-orange-50",
  "In progress": "text-blue-700 border-blue-200 bg-blue-50",
  Ready: "text-purple-700 border-purple-200 bg-purple-50",
  Claimed: "text-gray-700 border-gray-200 bg-gray-50",
  Cancelled: "text-red-700 border-red-200 bg-red-50",
};

const PILL = "inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold";
const TH = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";

// "09171234567" → "0917 123 4567"; anything else as-is.
function formatPhone(phone: string) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

export default function SalesTable({ orders, loading }: SalesTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={TH}>Customer</th>
              <th className={TH}>Date</th>
              <th className={TH}>Staff</th>
              <th className={TH}>Laundry items</th>
              <th className={`${TH} text-right`}>Total</th>
              <th className={TH}>Payment</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-100 ${loading ? "opacity-50" : ""}`}>
            {orders.length > 0 ? (
              orders.map((order) => {
                const items = order.items && order.items.length > 0 ? formatGroupedItems(order.items) : "—";
                return (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{order.customer}</p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        {order.contact ? formatPhone(order.contact) : "No number"}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <p className="text-gray-900">{order.date}</p>
                      <p className="text-xs text-gray-500">{order.time}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{order.staffName || "—"}</td>
                    <td className="px-4 py-3 max-w-[240px] truncate text-gray-700" title={items}>
                      {items}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900 tabular-nums">
                      ₱{order.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${PILL} ${PAYMENT_BADGE_CLASS[paymentTone(order)]}`} title={paymentHint(order)}>
                        {paymentLabel(order)}
                        {/* The method only on plain paid orders — the refund labels stay short. */}
                        {paymentTone(order) === "paid" && order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${PILL} ${statusStyles[order.status]}`}>{order.status}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  No sales records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
