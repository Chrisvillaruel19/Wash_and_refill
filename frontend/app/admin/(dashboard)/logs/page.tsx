"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getRestockLogs, getEditedLogs } from "../../../lib/services/auditLogApi.service";
import { getExpenses, getExpensesPage } from "../../../lib/services/expensesApi.service";
import { getWithdrawals, WithdrawalRecord } from "../../../lib/services/withdrawalApi.service";
import { ActivityLog, ExpenseRecord } from "../../../staff/(dashboard)/types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";

const PAGE_SIZE = 8;

type LogTab = "restock" | "expense" | "edited" | "withdrawal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminLogsPage() {
  const [restockLogsAll, setRestockLogsAll] = useState<ActivityLog[]>([]);
  const [editedLogsAll, setEditedLogsAll] = useState<ActivityLog[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<LogTab>("restock");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [restockData, editedData, withdrawalsData] = await Promise.all([
          getRestockLogs(),
          getEditedLogs(),
          getWithdrawals(),
        ]);

        setRestockLogsAll(restockData);

        setEditedLogsAll(editedData);

        setWithdrawals(withdrawalsData);
      } catch {
        setLoadError("Unable to load logs. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const restockLogs = restockLogsAll.filter((l) =>
    l.message.toLowerCase().includes(search.toLowerCase())
  );
  const editedLogs = editedLogsAll.filter((l) =>
    l.message.toLowerCase().includes(search.toLowerCase())
  );
  const filteredWithdrawals = withdrawals.filter(
    (w) =>
      w.adminName.toLowerCase().includes(search.toLowerCase()) ||
      w.reason.toLowerCase().includes(search.toLowerCase())
  );

  const activityList = activeTab === "restock" ? restockLogs : editedLogs;

  const {
    page: activityPage,
    setPage: setActivityPage,
    totalPages: activityTotalPages,
    paginatedItems: paginatedActivity,
  } = usePagination(activityList, PAGE_SIZE, `${activeTab}-${search}`);

  // Expense Logs tab — real server-side pagination by default. The search
  // box is shared across every tab and searches full expense history (by
  // category/staff/description), which the backend's page/pageSize support
  // has no params for — so a search lazily falls back to a full fetch +
  // client-side filter, same hybrid pattern as Admin Expenses/Claim
  // Monitoring. Unlike those pages, there are no stat cards here needing the
  // complete set unconditionally, so the full fetch only ever happens once
  // the user actually searches.
  const isSearchingExpenses = search !== "";
  const [expensesFull, setExpensesFull] = useState<ExpenseRecord[] | null>(null);
  const [expensesFullLoading, setExpensesFullLoading] = useState(false);

  useEffect(() => {
    if (!isSearchingExpenses) return;
    let cancelled = false;
    setExpensesFullLoading(true);
    getExpenses()
      .then((data) => {
        if (!cancelled) setExpensesFull(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to load expense logs. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setExpensesFullLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSearchingExpenses]);

  const {
    page: expenseServerPage,
    setPage: setExpenseServerPage,
    totalPages: expenseServerTotalPages,
    items: expenseServerItems,
    loading: expenseServerLoading,
  } = useServerPage(getExpensesPage, PAGE_SIZE, !isSearchingExpenses);

  const filteredExpenses = (expensesFull ?? []).filter(
    (e) =>
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.submittedBy.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
  );

  const {
    page: expenseClientPage,
    setPage: setExpenseClientPage,
    totalPages: expenseClientTotalPages,
    paginatedItems: expenseClientPaginatedItems,
  } = usePagination(filteredExpenses, PAGE_SIZE, search);

  const expensePage = isSearchingExpenses ? expenseClientPage : expenseServerPage;
  const setExpensePage = isSearchingExpenses ? setExpenseClientPage : setExpenseServerPage;
  const expenseTotalPages = isSearchingExpenses ? expenseClientTotalPages : expenseServerTotalPages;
  const paginatedExpenses = isSearchingExpenses ? expenseClientPaginatedItems : expenseServerItems;
  const expenseTableLoading = isSearchingExpenses ? expensesFullLoading : expenseServerLoading;

  const {
    page: withdrawalPage,
    setPage: setWithdrawalPage,
    totalPages: withdrawalTotalPages,
    paginatedItems: paginatedWithdrawals,
  } = usePagination(filteredWithdrawals, PAGE_SIZE, search);

  if (loading) {
    return <p className="text-gray-400 p-6">Loading logs...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {activeTab === "restock"
          ? "Restock Logs"
          : activeTab === "expense"
          ? "Expense Logs"
          : activeTab === "withdrawal"
          ? "Withdrawal Logs"
          : "Edited Logs"}
      </h1>
      <p className="text-gray-500 mb-6">
        {activeTab === "expense" || activeTab === "withdrawal"
          ? "Structured records — matches the underlying entity directly."
          : "Activity log entries — shown as recorded, not reconstructed into extra columns."}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("restock")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "restock"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Restock Logs
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "expense"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Expense Logs
          </button>
          <button
            onClick={() => setActiveTab("edited")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "edited"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Edited Logs
          </button>
          <button
            onClick={() => setActiveTab("withdrawal")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "withdrawal"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Withdrawal Logs
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="logs-search"
            autoComplete="off"
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      {activeTab === "expense" ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3 whitespace-nowrap">Staff</th>
                    <th className="p-3 whitespace-nowrap">Category</th>
                    <th className="p-3 whitespace-nowrap">Amount</th>
                    <th className="p-3 whitespace-nowrap">Description</th>
                  </tr>
                </thead>
                <tbody className={expenseTableLoading ? "opacity-50" : undefined}>
                  {paginatedExpenses.length > 0 ? (
                    paginatedExpenses.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatDate(e.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(e.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{e.submittedBy}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{e.category}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">₱{e.amount.toFixed(2)}</td>
                        <td className="p-3 max-w-[240px] truncate text-gray-900" title={e.description}>
                          {e.description}
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
          <Pagination page={expensePage} totalPages={expenseTotalPages} onPageChange={setExpensePage} />
        </>
      ) : activeTab === "withdrawal" ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3 whitespace-nowrap">Admin</th>
                    <th className="p-3 whitespace-nowrap">Amount</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWithdrawals.length > 0 ? (
                    paginatedWithdrawals.map((w) => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatDate(w.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(w.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{w.adminName}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">₱{w.amount.toFixed(2)}</td>
                        <td className="p-3 text-gray-900">{w.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No withdrawal records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            page={withdrawalPage}
            totalPages={withdrawalTotalPages}
            onPageChange={setWithdrawalPage}
          />
        </>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatDate(l.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(l.timestamp)}</td>
                        <td className="p-3 text-gray-900">{l.message}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-400">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={activityPage} totalPages={activityTotalPages} onPageChange={setActivityPage} />
        </>
      )}
    </div>
  );
}
