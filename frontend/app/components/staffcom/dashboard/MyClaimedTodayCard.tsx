import CardHeader from "../../admincom/dashboard/CardHeader";
import { peso } from "../../admincom/dashboard/format";
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
  const total = orders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <CardHeader title="My claimed orders today" />
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-semibold text-gray-900">{orders.length}</span> released
        {orders.length > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-gray-900 tabular-nums">{peso(total)}</span>
          </>
        )}
      </p>

      {orders.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{order.customer}</p>
                <p className="text-xs text-gray-500 truncate">
                  {order.contact} · {order.time}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{peso(order.amount)}</p>
                <p className={`text-xs ${order.payStatus === "Paid" ? "text-green-600" : "text-red-500"}`}>
                  {order.payStatus === "Paid" ? "Paid" : "Unpaid"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm py-6 text-center">No claimed orders yet today.</p>
      )}
    </div>
  );
}
