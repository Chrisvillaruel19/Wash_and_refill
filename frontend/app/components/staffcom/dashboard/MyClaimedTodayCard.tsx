"use client";

import { PackageCheck } from "lucide-react";
import CardHeader from "../../admincom/dashboard/CardHeader";
import Pagination from "../Pagination";
import { usePagination } from "../../../lib/usePagination";
import { peso } from "../../admincom/dashboard/format";
import { Order } from "../../../staff/(dashboard)/types";
import { paymentLabel, paymentTone, PAYMENT_BADGE_CLASS } from "../../../lib/paymentDisplay";

// Deliberately no filter tabs or search — unlike OrdersTable, this data is
// already server-scoped to exactly "my claimed orders today" (see
// getMyClaimedOrdersToday), so there's nothing left to filter. Read-only,
// same as OrdersTable — no status/payment actions here, this is a record
// view, not an order-management surface.
interface MyClaimedTodayCardProps {
  orders: Order[];
}

// 5 per page — a busy day can mean dozens of claims; the summary above
// always covers all of them.
const PAGE_SIZE = 5;

// "09171234567" → "0917 123 4567"; anything else as-is.
function formatPhone(phone: string) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function SummaryTile({ label, value, tone, note }: { label: string; value: string; tone: string; note?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
      {note && <p className="text-[11px] opacity-75 tabular-nums">{note}</p>}
    </div>
  );
}

// What the shop kept from an order: its amount minus the refunds already
// given back (a cash refund still waiting to be handed over is still in the
// drawer, so it isn't taken off yet — same as "My shift sales").
function keptAmount(order: Order) {
  const given = Math.max(0, (order.refundedAmount ?? 0) - (order.refundToGive ?? 0));
  return order.amount - given;
}

export default function MyClaimedTodayCard({ orders }: MyClaimedTodayCardProps) {
  // No recorded method = Cash, same as everywhere else. Refunds go back by
  // the same method, so each total is shown after its own refunds.
  const isGcash = (o: Order) => o.paymentMethod === "GCash";
  const sumOf = (list: Order[], amountOf: (o: Order) => number) => list.reduce((sum, o) => sum + amountOf(o), 0);
  const gcash = sumOf(orders.filter(isGcash), keptAmount);
  const cash = sumOf(orders, keptAmount) - gcash;
  const grossTotal = sumOf(orders, (o) => o.amount);
  const grossGcash = sumOf(orders.filter(isGcash), (o) => o.amount);
  const grossCash = grossTotal - grossGcash;
  // "of ₱600.00" under a tile only when refunds changed it.
  const before = (gross: number, net: number) => (gross !== net ? `of ${peso(gross)}` : undefined);
  const { page, setPage, totalPages, paginatedItems } = usePagination(orders, PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6 h-full flex flex-col">
      <CardHeader title="My claimed orders today" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <SummaryTile label="Released" value={String(orders.length)} tone="bg-sky-50 text-sky-800" />
        {/* What was released, in full — Cash and GCash next to it show
            what's left after refunds. */}
        <SummaryTile label="Total" value={peso(grossTotal)} tone="bg-green-50 text-green-800" />
        <SummaryTile label="Cash" value={peso(cash)} note={before(grossCash, cash)} tone="bg-slate-100 text-slate-800" />
        <SummaryTile label="GCash" value={peso(gcash)} note={before(grossGcash, gcash)} tone="bg-blue-50 text-blue-800" />
      </div>

      {orders.length > 0 ? (
        <>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {paginatedItems.map((order) => (
              <li key={order.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 text-sky-700 text-sm font-semibold shrink-0"
                >
                  {initials(order.customer)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{order.customer}</p>
                  <p className="text-xs text-gray-600 truncate tabular-nums">
                    {order.contact ? formatPhone(order.contact) : "No number"} · {order.time}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 tabular-nums">{peso(order.amount)}</p>
                  {/* Cash/GCash is already split in the tiles above, so a plain
                      paid order shows just its amount; only a refund is flagged. */}
                  {paymentTone(order) !== "paid" && (
                    <span
                      className={`inline-block mt-0.5 rounded-full border px-2 py-px text-[11px] font-semibold ${
                        PAYMENT_BADGE_CLASS[paymentTone(order)]
                      }`}
                    >
                      {paymentLabel(order)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <PackageCheck size={28} className="text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-600">No claimed orders yet today.</p>
          <p className="text-xs text-gray-500">Orders you release to customers show up here.</p>
        </div>
      )}
    </div>
  );
}
