import { Order, OrderStatus } from "../../../staff/(dashboard)/types";
import { formatGroupedItems } from "../../../lib/groupItems";

interface SalesTableProps {
  orders: Order[];
}

const statusStyles: Record<OrderStatus, string> = {
  Pending: "text-orange-500",
  "In progress": "text-blue-600",
  Ready: "text-purple-600",
  Claimed: "text-green-600",
};

export default function SalesTable({ orders }: SalesTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-700 border-b bg-gray-50">
              <th className="p-3 sm:p-4 whitespace-nowrap">Customer</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Date</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Contact</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Staff</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Laundry Items</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Total</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.customer}</td>
                  <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.date}</td>
                  <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.contact}</td>
                  <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{order.staffName || "N/A"}</td>
                  <td
                    className="p-3 sm:p-4 font-medium max-w-[200px] truncate text-gray-900"
                    title={order.items && order.items.length > 0 ? formatGroupedItems(order.items) : undefined}
                  >
                    {order.items && order.items.length > 0
                      ? formatGroupedItems(order.items)
                      : "—"}
                  </td>
                  <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">₱{order.amount.toFixed(2)}</td>
                  <td className={`p-3 sm:p-4 font-semibold whitespace-nowrap ${statusStyles[order.status]}`}>
                    {order.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
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