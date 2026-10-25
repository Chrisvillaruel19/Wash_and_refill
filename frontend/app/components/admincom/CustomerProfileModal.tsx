"use client";

import { useEffect, useState } from "react";
import { X, Phone } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { usePagination } from "../../lib/usePagination";
import Pagination from "../staffcom/Pagination";
import {
  CustomerOrder,
  CustomerProfile,
  getCustomerProfile,
} from "../../lib/services/customersApi.service";

// A regular can have hundreds of orders — 8 per page, newest first.
const ORDERS_PAGE_SIZE = 8;

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

// Stable empty list so the pager doesn't reset on every render while loading.
const EMPTY_ORDERS: CustomerOrder[] = [];

const STATUS_LABEL: Record<CustomerOrder["status"], string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  READY: "Ready",
  CLAIMED: "Claimed",
  CANCELLED: "Cancelled",
};
const STATUS_CLASS: Record<CustomerOrder["status"], string> = {
  PENDING: "bg-orange-50 text-orange-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  READY: "bg-green-50 text-green-700",
  CLAIMED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-50 text-red-600",
};

function paymentText(o: CustomerOrder) {
  if (o.paymentStatus === "UNPAID") return { text: "Unpaid", cls: "text-red-500" };
  if (o.refunded > 0 && o.refunded >= o.totalAmount) return { text: "Refunded", cls: "text-gray-500" };
  if (o.refunded > 0) return { text: `Refunded ${peso(o.refunded)}`, cls: "text-amber-600" };
  return { text: o.paymentMethod === "GCASH" ? "Paid · GCash" : "Paid · Cash", cls: "text-green-600" };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// Admin-only customer profile: totals and every order with its status and
// payment.
export default function CustomerProfileModal({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getCustomerProfile(customerId)
      .then(setProfile)
      .catch(() => setLoadError("Unable to load this customer. Please try again."));
  }, [customerId]);

  const {
    page: orderPage,
    setPage: setOrderPage,
    totalPages: orderTotalPages,
    paginatedItems: pagedOrders,
  } = usePagination(profile?.orders ?? EMPTY_ORDERS, ORDERS_PAGE_SIZE);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-sky-50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Customer profile"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 bg-white px-5 sm:px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{profile?.customer.name ?? "Customer"}</h2>
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <Phone size={14} />
              {profile ? profile.customer.phoneNumber ?? "No phone number" : "…"}
            </p>
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

        {/* Name and stats stay put; only the order list scrolls. On a very
            short screen the whole body scrolls instead. */}
        <div className="min-h-0 flex-1 flex flex-col gap-5 overflow-y-auto list-scroll p-5 sm:p-6">
          {loadError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg py-2 px-3">{loadError}</p>}
          {!profile && !loadError && <p className="text-gray-400 text-sm">Loading customer...</p>}

          {profile && (
            <>
              <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label="Visits"
                  value={String(profile.stats.visits)}
                  sub={profile.stats.cancelled > 0 ? `+${profile.stats.cancelled} cancelled` : undefined}
                />
                <Stat
                  label="Total spent"
                  value={peso(profile.stats.spent)}
                  sub={profile.stats.refunded > 0 ? `after ${peso(profile.stats.refunded)} refunded` : undefined}
                />
                <Stat label="Average order" value={peso(profile.stats.averageOrder)} />
                <Stat
                  label="Last visit"
                  value={day(profile.stats.lastVisit)}
                  sub={profile.stats.firstVisit ? `First: ${day(profile.stats.firstVisit)}` : undefined}
                />
              </div>

              <div className="min-h-[260px] flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
                <h3 className="shrink-0 px-4 py-3 text-sm font-semibold text-gray-800 border-b border-gray-100">
                  Order history ({profile.orders.length})
                </h3>
                {profile.orders.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">No orders yet.</p>
                ) : (
                  <>
                  {/* Scrolls on its own; the column headings stay on top. */}
                  <div className="min-h-0 flex-1 overflow-auto list-scroll">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                          <th className="p-3 text-left font-semibold">Date</th>
                          <th className="p-3 text-left font-semibold">Name used</th>
                          <th className="p-3 text-left font-semibold">Staff</th>
                          <th className="p-3 text-right font-semibold">Total</th>
                          <th className="p-3 text-left font-semibold">Payment</th>
                          <th className="p-3 text-left font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrders.map((o) => {
                          const pay = paymentText(o);
                          return (
                            <tr key={o.id} className="border-t border-gray-100">
                              <td className="p-3 whitespace-nowrap text-gray-900">
                                {new Date(o.createdAt).toLocaleDateString()}
                                <span className="block text-xs text-gray-400">
                                  {new Date(o.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  {o.isSelfService ? " · Self service" : ""}
                                </span>
                              </td>
                              <td className="p-3 text-gray-900">{o.customerName}</td>
                              <td className="p-3 text-gray-700 whitespace-nowrap">{o.staffName}</td>
                              <td className="p-3 text-right text-gray-900 tabular-nums whitespace-nowrap">{peso(o.totalAmount)}</td>
                              <td className={`p-3 whitespace-nowrap text-xs font-semibold ${pay.cls}`}>{pay.text}</td>
                              <td className="p-3">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[o.status]}`}>
                                  {STATUS_LABEL[o.status]}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {orderTotalPages > 1 && (
                    <div className="shrink-0 border-t border-gray-100 px-4 pb-3">
                      <Pagination page={orderPage} totalPages={orderTotalPages} onPageChange={setOrderPage} />
                    </div>
                  )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
