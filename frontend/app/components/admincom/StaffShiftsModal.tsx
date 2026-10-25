"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import Pagination from "../staffcom/Pagination";
import { getStaffShiftHandoversPage, StaffShiftSummary } from "../../lib/services/shiftHandoverApi.service";
import { ShiftHandoverRecord } from "../../staff/(dashboard)/types";

// A staff member can have hundreds of shifts — 8 per page, newest first.
const SHIFTS_PAGE_SIZE = 8;

function peso(n: number) {
  const abs = Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}₱${abs}`;
}
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

// Amounts taken off: "−₱200.00", or "₱0.00" when nothing.
const minus = (n: number) => (n > 0 ? `−${peso(n)}` : peso(0));

// "Oct 21, 2026 · 8:54 PM"
function dateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

// Over/short colour and word, rounded to the centavo like the handover itself.
function describe(diff: number) {
  const r = Math.round(diff * 100);
  if (r < 0) return { label: "Short", cls: "text-red-600" };
  if (r > 0) return { label: "Over", cls: "text-green-600" };
  return { label: "Balanced", cls: "text-gray-500" };
}

// One line of a breakdown card: label on the left, amount on the right.
function Line({
  label,
  value,
  strong,
  red,
  valueClass,
}: {
  label: string;
  value: string;
  strong?: boolean;
  red?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`flex justify-between gap-3 px-3 py-1.5 text-sm ${strong ? "border-t border-gray-100 font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${valueClass ?? (red ? "text-red-600" : "")}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, valueClass = "text-gray-900", sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// Admin Sales: every Cashier Shift Summary of one staff member, opened from
// that staff member's row. Each shift opens its breakdown (sales and cash
// drawer); "View supplies" shows its supplies.
export default function StaffShiftsModal({
  staff,
  onViewSupplies,
  onClose,
}: {
  staff: StaffShiftSummary;
  onViewSupplies: (shift: ShiftHandoverRecord) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [page, setPage] = useState(1);
  const [shifts, setShifts] = useState<ShiftHandoverRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // The one shift whose breakdown is open.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getStaffShiftHandoversPage(staff.userId, page, SHIFTS_PAGE_SIZE)
      .then((r) => {
        if (cancelled) return;
        setShifts(r.items);
        setTotalPages(r.totalPages);
        setLoadError("");
      })
      .catch(() => !cancelled && setLoadError("Unable to load this staff member's shifts. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [staff.userId, page]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-sky-50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${staff.staffName}'s shift summaries`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-white px-5 sm:px-6 py-4 border-b border-gray-200 rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{staff.staffName}</h2>
            <p className="text-sm text-gray-500">Cashier shift summaries</p>
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

        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Shifts" value={String(staff.shifts)} />
            <Stat label="Total sales" value={peso(staff.totalSales)} />
            <Stat
              label="Over / Short"
              value={peso(staff.overShort)}
              valueClass={staff.overShort < 0 ? "text-red-600" : staff.overShort > 0 ? "text-green-600" : "text-gray-900"}
              sub="All shifts combined"
            />
            <Stat label="Last shift" value={day(staff.lastShift)} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Shift summaries ({staff.shifts})</h3>
              <p className="text-xs text-gray-400">Click a shift to see its breakdown.</p>
            </div>
            {loadError && <p className="m-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg py-2 px-3">{loadError}</p>}

            {/* Column labels (desktop) — each row shows the figures the Admin
                checks first; the full breakdown opens under it. */}
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_20px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Date / time</span>
              <span className="text-right">Total sales</span>
              <span className="text-right">Expected</span>
              <span className="text-right">Counted</span>
              <span className="text-right">Over / Short</span>
              <span />
            </div>

            <ul className={`divide-y divide-gray-100 tabular-nums ${loading ? "opacity-50" : ""}`}>
              {shifts.map((h) => {
                const open = h.id === expandedId;
                const totalSales = h.laundrySales + h.supplySales + (h.customServiceSales ?? 0);
                const gcashSales = h.digitalSales ?? 0;
                const gcashRefunds = h.gcashRefunds ?? 0;
                const cashRefunds = h.refundsPaid ?? 0;
                const status = describe(h.shortage);
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : h.id)}
                      aria-expanded={open}
                      className="w-full grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_20px] gap-x-3 gap-y-1 items-center px-4 py-3 text-left text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{dateTime(h.timestamp)}</span>
                      <span className="text-right font-semibold text-gray-900 sm:font-medium">
                        <span className="sm:hidden text-xs font-normal text-gray-500">Sales </span>
                        {peso(totalSales)}
                      </span>
                      <span className="hidden sm:block text-right text-gray-700">{peso(h.expectedCash)}</span>
                      <span className="hidden sm:block text-right text-gray-700">{peso(h.actualCashCounted)}</span>
                      <span className={`col-span-2 sm:col-span-1 text-right font-semibold ${status.cls}`}>
                        {peso(h.shortage)} <span className="text-xs font-medium">{status.label}</span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={`hidden sm:block text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-gray-50/60 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg border border-gray-200 bg-white">
                            <p className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Sales</p>
                            <Line label="Laundry" value={peso(h.laundrySales)} />
                            <Line label="Supply" value={peso(h.supplySales)} />
                            <Line label="Custom service" value={peso(h.customServiceSales ?? 0)} />
                            <Line label="Total sales" value={peso(totalSales)} strong />
                            <Line label="GCash sales (not in drawer)" value={peso(gcashSales)} />
                            <Line label="GCash refunds" value={minus(gcashRefunds)} red={gcashRefunds > 0} />
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white">
                            <p className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Cash drawer</p>
                            <Line label="Starting cash" value={peso(h.cashDrawer)} />
                            <Line label="+ Cash sales" value={peso(totalSales - gcashSales)} />
                            <Line label="− Cash refunds" value={minus(cashRefunds)} red={cashRefunds > 0} />
                            <Line label="− Expenses" value={minus(h.expense)} red={h.expense > 0} />
                            <Line label="− Withdrawals" value={minus(h.withdrawals)} red={h.withdrawals > 0} />
                            <Line label="= Expected cash" value={peso(h.expectedCash)} strong />
                            <Line label="Cash counted" value={peso(h.actualCashCounted)} />
                            <Line label="Over / Short" value={`${peso(h.shortage)} · ${status.label}`} strong valueClass={status.cls} />
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          <span className="text-gray-500">Notes:</span> {h.notes || "—"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onViewSupplies(h)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                          >
                            View supplies
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {!loading && shifts.length === 0 && !loadError && (
                <li className="p-6 text-center text-sm text-gray-500">No shift summaries yet.</li>
              )}
            </ul>
            <div className="px-4 pb-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
