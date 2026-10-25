"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { groupItems } from "../../lib/groupItems";
import { paymentLabel, paymentTone, PAYMENT_BADGE_CLASS, PAYMENT_TEXT_CLASS } from "../../lib/paymentDisplay";
import { getOrderDetailLines, OrderDetailLine } from "../../lib/services/ordersApi.service";
import { Order, OrderStatus } from "../../staff/(dashboard)/types";

const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending: "text-orange-700 border-orange-200 bg-orange-50",
  "In progress": "text-blue-700 border-blue-200 bg-blue-50",
  Ready: "text-purple-700 border-purple-200 bg-purple-50",
  Claimed: "text-green-700 border-green-200 bg-green-50",
  Cancelled: "text-red-700 border-red-200 bg-red-50",
};
const PILL = "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "09171234567" → "0917 123 4567"; anything else as-is.
function formatPhone(phone: string) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

// "Barong tagalog (Wash & Dry) · 2 kg", "Detergent ×2".
function lineText(l: OrderDetailLine) {
  const name = l.label ?? l.name;
  if (l.type === "SERVICE" && l.weight) return `${name} · ${l.weight} kg${l.quantity > 1 ? ` ×${l.quantity}` : ""}`;
  return l.quantity > 1 ? `${name} ×${l.quantity}` : name;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{children}</span>
    </div>
  );
}

// "View more" for Laundry Monitoring (Admin) and Staff Sales: every detail of
// one order, opened by clicking its row — the tables only keep the columns
// that fit. Refund is the Admin's only (left out on the staff side).
export default function OrderDetailsModal({
  order,
  canRefund = false,
  onRefund,
  onClose,
}: {
  order: Order;
  canRefund?: boolean;
  onRefund?: () => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const tone = paymentTone(order);
  // Each line with its kilos and amount (GET /orders/:id); until it loads —
  // or if it can't — the names from the list are shown instead.
  const [lines, setLines] = useState<OrderDetailLine[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getOrderDetailLines(order.id)
      .then((l) => !cancelled && setLines(l))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [order.id]);
  const fallbackItems = order.items && order.items.length > 0 ? groupItems(order.items) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Order of ${order.customer}`}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{order.customer}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {order.contact ? formatPhone(order.contact) : "No number"} · {order.date}
              {order.time ? ` · ${order.time}` : ""} · by {order.staffName || "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`${PILL} ${STATUS_BADGE[order.status]}`}>{order.status}</span>
              <span className={`${PILL} ${PAYMENT_BADGE_CLASS[tone]}`}>
                {tone !== "unpaid" && order.paymentMethod ? `${order.paymentMethod} · ` : ""}
                {paymentLabel(order)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto list-scroll px-5 py-4 space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Laundry items</h3>
            {/* About 6 lines, then the list scrolls on its own; Total stays below it. */}
            <ul className="max-h-[216px] overflow-y-auto list-scroll pr-1 divide-y divide-gray-100 text-sm">
              {lines
                ? lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4 py-1.5">
                      <span className="min-w-0 break-words text-gray-900">{lineText(l)}</span>
                      <span className="shrink-0 tabular-nums text-gray-700">{peso(l.subtotal)}</span>
                    </li>
                  ))
                : fallbackItems.map((g) => (
                    <li key={g.name} className="flex justify-between gap-4 py-1.5 text-gray-900">
                      <span className="min-w-0 break-words">{g.name}</span>
                      {g.qty > 1 && <span className="shrink-0 text-gray-500">×{g.qty}</span>}
                    </li>
                  ))}
              {lines?.length === 0 && fallbackItems.length === 0 && <li className="py-1.5 text-gray-500">—</li>}
            </ul>
            <div className="mt-1 flex justify-between gap-4 border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900">
              <span>Total</span>
              <span className="tabular-nums">{peso(order.amount)}</span>
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</h3>
            <Row label="Payment method">{tone === "unpaid" || !order.paymentMethod ? "—" : order.paymentMethod}</Row>
            <Row label="Payment">
              <span className={`font-semibold ${tone === "paid" ? "text-blue-600" : PAYMENT_TEXT_CLASS[tone]}`}>
                {paymentLabel(order)}
              </span>
            </Row>
            {tone !== "unpaid" && (
              <Row label="Refunded so far">
                <span className={`tabular-nums ${order.refundedAmount > 0 ? "text-red-600" : ""}`}>
                  {order.refundedAmount > 0 ? `−${peso(order.refundedAmount)}` : peso(0)}
                </span>
              </Row>
            )}
            {(order.refundToGive ?? 0) > 0 && (
              <Row label="Refund to give">
                <span className="text-amber-700">Staff to give {peso(order.refundToGive ?? 0)} cash</span>
              </Row>
            )}
          </section>
        </div>

        <div className="shrink-0 flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 cursor-pointer"
          >
            Close
          </button>
          {canRefund && onRefund && (
            <button
              type="button"
              onClick={onRefund}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 cursor-pointer"
            >
              Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
