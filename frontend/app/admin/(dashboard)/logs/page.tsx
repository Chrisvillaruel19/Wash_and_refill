"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import {
  getRestockLogs,
  getEditedLogs,
  getPasswordResetLogs,
  getRefundLogs,
  getAllLogsPage,
  getRecentLogs,
  AuditLogEntry,
} from "../../../lib/services/auditLogApi.service";
import { getExpenses, getExpensesPage } from "../../../lib/services/expensesApi.service";
import { getWithdrawals, WithdrawalRecord } from "../../../lib/services/withdrawalApi.service";
import { ActivityLog, ExpenseRecord } from "../../../staff/(dashboard)/types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { useServerPage } from "../../../lib/useServerPage";

const PAGE_SIZE = 8;

type LogTab = "all" | "restock" | "expense" | "edited" | "withdrawal" | "password" | "refund";

// What the search box looks through on each tab (its placeholder).
const SEARCH_HINT: Record<LogTab, string> = {
  all: "all logs",
  restock: "restocks",
  expense: "expenses",
  edited: "edits",
  withdrawal: "withdrawals",
  password: "password resets",
  refund: "cancellations & refunds",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminLogsPage() {
  const [restockLogsAll, setRestockLogsAll] = useState<ActivityLog[]>([]);
  const [editedLogsAll, setEditedLogsAll] = useState<ActivityLog[]>([]);
  const [passwordLogsAll, setPasswordLogsAll] = useState<ActivityLog[]>([]);
  const [refundLogsAll, setRefundLogsAll] = useState<ActivityLog[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<LogTab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [restockData, editedData, withdrawalsData, passwordData, refundData] = await Promise.all([
          getRestockLogs(),
          getEditedLogs(),
          getWithdrawals(),
          getPasswordResetLogs(),
          getRefundLogs(),
        ]);

        setPasswordLogsAll(passwordData);

        setRefundLogsAll(refundData);

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
  const passwordLogs = passwordLogsAll.filter((l) =>
    l.message.toLowerCase().includes(search.toLowerCase())
  );
  const filteredWithdrawals = withdrawals.filter(
    (w) =>
      w.adminName.toLowerCase().includes(search.toLowerCase()) ||
      w.reason.toLowerCase().includes(search.toLowerCase())
  );

  const refundLogs = refundLogsAll.filter((l) =>
    l.message.toLowerCase().includes(search.toLowerCase())
  );

  const activityList =
    activeTab === "restock"
      ? restockLogs
      : activeTab === "password"
        ? passwordLogs
        : activeTab === "refund"
          ? refundLogs
          : editedLogs;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // All tab — every log type. Browsing uses real server pages (the full
  // history can be large); a search falls back to the newest entries
  // filtered client-side, same cap as the other log tabs.
  const isSearchingAll = activeTab === "all" && search !== "";
  const {
    page: allServerPage,
    setPage: setAllServerPage,
    totalPages: allServerTotalPages,
    items: allServerItems,
    loading: allServerLoading,
  } = useServerPage(getAllLogsPage, PAGE_SIZE, activeTab === "all" && !isSearchingAll);

  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[] | null>(null);
  const [recentLogsLoading, setRecentLogsLoading] = useState(false);
  // Shown in the table, not page-wide: a failed search shouldn't hide the
  // whole Logs page. Cleared when the search is cleared, so it can retry.
  const [recentLogsError, setRecentLogsError] = useState("");
  // Fetched fresh each time a search starts (and dropped when it's cleared),
  // so entries logged since the last search show up too.
  useEffect(() => {
    if (!isSearchingAll) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecentLogs(null);
      setRecentLogsError("");
      return;
    }
    if (recentLogs || recentLogsError) return;
    let cancelled = false;
    setRecentLogsLoading(true);
    getRecentLogs()
      .then((data) => {
        if (!cancelled) setRecentLogs(data);
      })
      .catch(() => {
        if (!cancelled) setRecentLogsError("Unable to search logs right now. Clear the search and try again.");
      })
      .finally(() => {
        if (!cancelled) setRecentLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSearchingAll, recentLogs, recentLogsError]);

  const filteredRecentLogs = (recentLogs ?? []).filter(
    (l) =>
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase())
  );
  const {
    page: allClientPage,
    setPage: setAllClientPage,
    totalPages: allClientTotalPages,
    paginatedItems: allClientItems,
  } = usePagination(filteredRecentLogs, PAGE_SIZE, search);

  const allPage = isSearchingAll ? allClientPage : allServerPage;
  const setAllPage = isSearchingAll ? setAllClientPage : setAllServerPage;
  const allTotalPages = isSearchingAll ? allClientTotalPages : allServerTotalPages;
  const allItems = isSearchingAll ? allClientItems : allServerItems;
  const allTableLoading = isSearchingAll ? recentLogsLoading : allServerLoading;

  if (loading) {
    return <p className="text-gray-400 p-6">Loading logs...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {activeTab === "all"
          ? "All Logs"
          : activeTab === "restock"
          ? "Restock Logs"
          : activeTab === "expense"
          ? "Expense Logs"
          : activeTab === "withdrawal"
          ? "Withdrawal Logs"
          : activeTab === "password"
          ? "Password Reset Logs"
          : activeTab === "refund"
          ? "Cancellations & Refunds"
          : "Edited Logs"}
      </h1>
      <p className="text-gray-500 mb-6">
        {activeTab === "expense" || activeTab === "withdrawal"
          ? "Structured records — matches the underlying entity directly."
          : "Activity log entries — shown as recorded, not reconstructed into extra columns."}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-5 gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All
          </button>
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
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "password"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Password Resets
          </button>
          <button
            onClick={() => setActiveTab("refund")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === "refund"
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Cancellations & Refunds
          </button>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            placeholder={`Search ${SEARCH_HINT[activeTab]}…`}
            aria-label={`Search ${SEARCH_HINT[activeTab]}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="logs-search"
            autoComplete="off"
            className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-9 bg-white text-gray-900 placeholder:text-gray-500 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {activeTab === "all" ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3 whitespace-nowrap">Type</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className={allTableLoading ? "opacity-50" : undefined}>
                  {allItems.length > 0 ? (
                    allItems.map((l) => (
                      <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatDate(l.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{formatTime(l.timestamp)}</td>
                        <td className="p-3 whitespace-nowrap text-gray-900">{l.type}</td>
                        <td className="p-3 text-gray-900">{l.message}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        {allTableLoading
                          ? "Loading..."
                          : isSearchingAll && recentLogsError
                            ? recentLogsError
                            : "No records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={allPage} totalPages={allTotalPages} onPageChange={setAllPage} />
        </>
      ) : activeTab === "expense" ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                      <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
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
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                      <tr key={w.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
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
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((l) => (
                      <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
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
