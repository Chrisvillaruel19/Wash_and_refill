"use client";

import { useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import { getPendingRefundPayouts, payOutRefund, RefundPayout } from "../../lib/services/ordersApi.service";
import { useAutoRefresh } from "../../lib/useAutoRefresh";
import { useActiveShift } from "../../lib/useActiveShift";
import { usePagination } from "../../lib/usePagination";
import Pagination from "./Pagination";
import { ApiError } from "../../lib/apiClient";

const peso = (n: number) => `₱${n.toFixed(2)}`;
const PAGE_SIZE = 5;

// Approved cash refunds (claimed orders, e.g. damaged items) waiting for the
// staff member on duty to hand the customer the cash from the drawer. Shown
// to every staff member — whoever is on duty when the customer comes back
// pays it. Once marked given, the cash leaves the drawer math, shows on the
// Shift Handover as "Refunds given to customers" and comes off that staff
// member's shift sales (Dashboard). Live: checks every 30 seconds.
// Renders nothing while there's nothing to give.
export default function RefundPayoutsCard({ onPaid, className = "mb-6" }: { onPaid?: () => void; className?: string }) {
  const [payouts, setPayouts] = useState<RefundPayout[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  // Only the staff member on an open shift (clocked in, no handover yet)
  // can give one — the server refuses anyone else. Shown while checking.
  const { state: shiftState } = useActiveShift();
  const onShift = shiftState === "onShift" || shiftState === "loading" || shiftState === "unknown";

  function refresh() {
    getPendingRefundPayouts()
      .then(setPayouts)
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
  }, []);
  useAutoRefresh(refresh);

  async function give(p: RefundPayout) {
    setPayingId(p.id);
    setError("");
    try {
      await payOutRefund(p.id);
      setConfirmingId(null);
      refresh();
      onPaid?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to record the refund. Please try again.");
      refresh();
    } finally {
      setPayingId(null);
    }
  }

  const { page, setPage, totalPages, paginatedItems } = usePagination(payouts, PAGE_SIZE);

  if (payouts.length === 0) return null;

  const totalToGive = payouts.reduce((sum, p) => sum + p.amount, 0);
  const summary =
    payouts.length === 1
      ? `1 refund to give — ${peso(payouts[0].amount)} cash to ${payouts[0].customerName}`
      : `${payouts.length} refunds to give — ${peso(totalToGive)} cash total`;

  // One line until opened, so it barely moves the dashboard.
  return (
    <div className={`bg-amber-50 border border-amber-300 rounded-xl ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2">
        <HandCoins size={18} className="text-amber-700 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-amber-900">{summary}</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded-lg px-3 py-1 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          {open ? "Hide" : "View"}
        </button>
      </div>

      {open && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3">
      <p className="text-xs text-amber-800 mb-3">
        When the customer comes, give them the cash from the drawer, then press &quot;Mark as given&quot; — it comes
        off your shift sales and your Shift Handover&apos;s expected cash.
      </p>
      {!onShift && (
        <p className="text-xs text-gray-700 bg-white border border-amber-200 rounded-lg py-2 px-3 mb-3">
          {shiftState === "handedOver"
            ? "You already submitted your Shift Handover, so the next staff on duty will give these."
            : "Clock in first — a refund is given from the drawer of the staff on duty."}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg py-2 px-3 mb-3">{error}</p>
      )}
      <ul className="space-y-2">
        {paginatedItems.map((p) => (
          <li
            key={p.id}
            className="bg-white border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Give <span className="text-amber-700">{peso(p.amount)}</span> cash to {p.customerName}
                {p.customerPhone && <span className="font-normal text-gray-500"> · {p.customerPhone}</span>}
              </p>
              <p className="text-xs text-gray-500">
                {p.reason} · approved by {p.approvedBy}{" "}
                {new Date(p.approvedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{" "}
                · order total {peso(p.orderTotal)}
              </p>
            </div>
            {confirmingId === p.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-700">Gave {peso(p.amount)}?</span>
                <button
                  type="button"
                  onClick={() => give(p)}
                  disabled={payingId === p.id}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {payingId === p.id ? "Saving..." : "Yes, given"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  disabled={payingId === p.id}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : !onShift ? null : (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setConfirmingId(p.id);
                }}
                className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
              >
                Mark as given
              </button>
            )}
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
