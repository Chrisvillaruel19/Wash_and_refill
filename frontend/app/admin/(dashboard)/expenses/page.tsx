"use client";

import { useEffect, useState } from "react";
import { Search, Receipt, Wallet } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";
import { getExpenses, getExpensesPage } from "../../../lib/services/expensesApi.service";
import { ExpenseRecord, ExpenseCategory } from "../../../staff/(dashboard)/types";

const PAGE_SIZE = 8;

type CategoryFilter = "All" | ExpenseCategory;

const categoryFilters: CategoryFilter[] = [
  "All",
  "Supplies & Materials",
  "Utilities",
  "Equipment Repair",
  "Rent",
  "Other",
];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        // GET /expenses is role-scoped server-side: an Admin caller gets
        // every staff member's expenses, not just their own.
        const data = await getExpenses();
        setExpenses(data);
      } catch {
        setError("Unable to load expenses. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const isFiltering = activeCategory !== "All" || search !== "";

  // Default (unfiltered) table browsing — real server-side pagination. The
  // stat cards above still need the complete `expenses` fetch regardless of
  // filter state (they're all-time totals, not filtered ones) — there's no
  // backend "total expenses / record count" endpoint, so that fetch can't be
  // eliminated here. This only decouples the raw table listing from it.
  const {
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverTotalPages,
    items: serverItems,
    loading: serverLoading,
  } = useServerPage(getExpensesPage, PAGE_SIZE, !isFiltering);

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = activeCategory === "All" || e.category === activeCategory;
    const matchesSearch =
      new Date(e.timestamp).toLocaleDateString().includes(search) ||
      e.submittedBy.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const {
    page: clientPage,
    setPage: setClientPage,
    totalPages: clientTotalPages,
    paginatedItems: clientPaginatedItems,
  } = usePagination(filteredExpenses, PAGE_SIZE, `${activeCategory}-${search}`);

  const page = isFiltering ? clientPage : serverPage;
  const setPage = isFiltering ? setClientPage : setServerPage;
  const totalPages = isFiltering ? clientTotalPages : serverTotalPages;
  const paginatedItems = isFiltering ? clientPaginatedItems : serverItems;
  const tableLoading = !isFiltering && serverLoading;

  if (loading) {
    return <p className="text-gray-400 p-6">Loading expenses...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-6">{error}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <AdminStatCard
          label="Total Expenses"
          value={`₱${totalAmount.toFixed(2)}`}
          icon={Wallet}
          iconColor="text-red-600 bg-red-100"
        />
        <AdminStatCard
          label="Total Records"
          value={expenses.length}
          icon={Receipt}
          iconColor="text-blue-600 bg-blue-100"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {categoryFilters.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === c
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search date or staff"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="admin-expense-search"
            autoComplete="off"
            className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-3 sm:p-4 whitespace-nowrap">Date</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Staff</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Category</th>
                <th className="p-3 sm:p-4">Description</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Amount</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Receipt</th>
              </tr>
            </thead>
            <tbody className={tableLoading ? "opacity-50" : undefined}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                      {new Date(e.timestamp).toLocaleDateString()}{" "}
                      {new Date(e.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{e.submittedBy}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">{e.category}</td>
                    <td className="p-3 sm:p-4 max-w-[240px] truncate text-gray-900" title={e.description}>
                      {e.description || "—"}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-900">
                      ₱{e.amount.toFixed(2)}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      {e.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.imageDataUrl}
                          alt="Receipt"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
