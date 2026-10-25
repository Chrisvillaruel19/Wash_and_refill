"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, Users, Repeat, UserPlus, ArrowUpDown } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import Pagination from "../../../components/staffcom/Pagination";
import CustomerProfileModal from "../../../components/admincom/CustomerProfileModal";
import CustomerAvatar from "../../../components/admincom/CustomerAvatar";
import {
  CustomerFilter,
  CustomerOverview,
  CustomerSort,
  CustomerSummary,
  getCustomerSummaries,
} from "../../../lib/services/customersApi.service";

const PAGE_SIZE = 10;

// Completed visits that make a customer a Regular — must match the
// backend's REGULAR_MIN_VISITS (customer-crm.repository.ts).
const REGULAR_MIN_VISITS = 5;

// One dropdown for how to list customers: three orderings, plus
// "Regular customers" (only 5+ visits, most recent first).
type ViewOption = CustomerSort | "regular";
const VIEWS: { value: ViewOption; label: string }[] = [
  { value: "recent", label: "Most recent visit" },
  { value: "visits", label: "Most visits" },
  { value: "name", label: "Name (A–Z)" },
  { value: "regular", label: "Regular customers" },
];


// "09171234567" → "0917 123 4567"; anything else as-is.
function formatPhone(phone: string) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

// "Today" / "Yesterday" / "3 days ago" / "Oct 12, 2026".
function lastVisitLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// Admin CRM: every customer the shop has served (linked by phone number),
// with visits, spending and last visit. Click one for the full profile.
export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<CustomerSort>("recent");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getCustomerSummaries({ search: debouncedSearch, sort, filter, page, pageSize: PAGE_SIZE })
      .then((r) => {
        if (cancelled) return;
        setCustomers(r.items);
        setOverview(r.overview);
        setTotalPages(r.totalPages);
        setTotal(r.total);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load customers. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sort, filter, page]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <AdminStatCard
          label="Total customers"
          value={overview ? overview.customers : "—"}
          icon={Users}
          iconColor="text-sky-600 bg-sky-100"
          sub="Linked by phone number"
        />
        <AdminStatCard
          label="Regulars"
          value={overview ? overview.regulars : "—"}
          icon={Repeat}
          iconColor="text-green-600 bg-green-100"
          sub={`${REGULAR_MIN_VISITS}+ visits`}
        />
        <AdminStatCard
          label="New this month"
          value={overview ? overview.newThisMonth : "—"}
          icon={UserPlus}
          iconColor="text-violet-600 bg-violet-100"
          sub="First visit this month"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{filter === "regular" ? "Regular customers" : "All customers"}</h2>
            <p className="text-xs text-gray-500">
              {debouncedSearch.trim()
                ? `${total} match${total === 1 ? "" : "es"} for “${debouncedSearch.trim()}”`
                : "Click a customer to see their orders"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone number"
                aria-label="Search customers by name or phone number"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-3 bg-white text-gray-900 placeholder:text-gray-500 text-sm"
              />
            </div>
            <div className="relative">
              <ArrowUpDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={filter === "regular" ? "regular" : sort}
                onChange={(e) => {
                  const v = e.target.value as ViewOption;
                  if (v === "regular") {
                    setFilter("regular");
                    setSort("recent");
                  } else {
                    setFilter("all");
                    setSort(v);
                  }
                  setPage(1);
                }}
                aria-label="Sort or filter customers"
                className="w-full sm:w-auto appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-full text-sm bg-white text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VIEWS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && <p className="m-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg py-2 px-3">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 sm:px-5 text-left font-semibold">Customer</th>
                <th className="py-3 px-3 text-left font-semibold">Phone</th>
                <th className="py-3 px-3 text-center font-semibold">Visits</th>
                <th className="py-3 px-3 text-left font-semibold">Last visit</th>
                <th className="py-3 pr-4 w-8" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
              {customers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Users size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">
                      {debouncedSearch
                        ? "No customers match your search."
                        : filter === "regular"
                          ? "No regular customers yet."
                          : "No customers yet."}
                    </p>
                    <p className="text-xs text-gray-400">
                      {debouncedSearch
                        ? "Try part of the name or phone number."
                        : filter === "regular"
                          ? `A customer becomes a regular after ${REGULAR_MIN_VISITS} visits.`
                          : "They appear here after their first order."}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const last = lastVisitLabel(c.lastVisit);
                  return (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      onClick={() => setSelectedId(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(c.id);
                        }
                      }}
                      className="group border-t border-gray-100 cursor-pointer transition-colors hover:bg-sky-50/70 focus:outline-none focus-visible:bg-sky-50"
                    >
                      <td className="py-3 px-4 sm:px-5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <CustomerAvatar name={c.name} seed={c.id} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                              <span className="truncate">{c.name}</span>
                            </p>
                            {c.visits >= REGULAR_MIN_VISITS ? (
                              <span className="inline-block mt-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 text-[11px] font-semibold px-2 py-px">
                                Regular
                              </span>
                            ) : c.visits >= 2 ? (
                              <span className="text-xs text-gray-500">Returning customer</span>
                            ) : c.visits === 1 ? (
                              <span className="text-xs text-gray-400">New customer</span>
                            ) : (
                              <span className="text-xs text-gray-400">No completed visits</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 whitespace-nowrap tabular-nums">
                        {c.phoneNumber ? formatPhone(c.phoneNumber) : <span className="text-gray-400">No number</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            c.visits >= REGULAR_MIN_VISITS ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.visits}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {last ? (
                          <span className={last === "Today" ? "text-green-700 font-medium" : "text-gray-700"}>{last}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-300 group-hover:text-sky-500 transition-colors">
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {selectedId && (
        <CustomerProfileModal
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
