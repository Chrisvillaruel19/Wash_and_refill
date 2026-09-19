import { Order } from "../../../staff/(dashboard)/types";

// Deliberately no filter tabs or search — unlike OrdersTable, this data is
// already server-scoped to exactly "my claimed orders today" (see
// getMyClaimedOrdersToday), so there's nothing left to filter. Read-only,
// same as OrdersTable — no status/payment actions here, this is a record
// view, not an order-management surface.
interface MyClaimedTodayCardProps {
  orders: Order[];
}

export default function MyClaimedTodayCard({ orders }: MyClaimedTodayCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">My Claimed Orders Today</h2>
        <span className="text-xs text-gray-400">{orders.length} claimed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Contact</th>
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3">pay_status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 text-gray-900">{order.customer}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.contact}</td>
                  <td className="py-3 pr-4 text-gray-900">{order.time}</td>
                  <td className="py-3 pr-4 text-gray-900">₱{order.amount.toFixed(2)}</td>
                  <td className="py-3 text-gray-900">{order.payStatus}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No claimed orders yet today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
