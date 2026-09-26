"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Settings } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import AdminWithdrawalFormModal, {
  WithdrawalFormData,
} from "../../../components/admincom/AdminWithdrawalFormModal";
import ShiftInventoryModal from "../../../components/admincom/ShiftInventoryModal";
import DefaultStartingCashModal from "../../../components/admincom/DefaultStartingCashModal";
import { getSalesBreakdown, SalesBreakdownRow } from "../../../lib/services/ordersApi.service";
import {
  getShiftHandoversPage,
  getDefaultStartingCash,
  updateDefaultStartingCash,
} from "../../../lib/services/shiftHandoverApi.service";
import {
  getWithdrawals,
  createWithdrawal,
  WithdrawalRecord,
} from "../../../lib/services/withdrawalApi.service";
import { ApiError } from "../../../lib/apiClient";
import Pagination from "../../../components/staffcom/Pagination";
import { useServerPage } from "../../../lib/useServerPage";

const HANDOVERS_PAGE_SIZE = 6;

// Local-time YYYY-MM-DD — same convention as Staff Sales' toDateInputValue,
// used only to ask getSalesBreakdown for "today" (Manila business-day
// resolution happens server-side in getBusinessDayRangeForDate).
function todayDateInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminSalesPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [paidSalesToday, setPaidSalesToday] = useState(0);
  // Paid, non-cancelled sales for the current Manila business day.
  const [todayAverageOrderValue, setTodayAverageOrderValue] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // Default Starting Cash (Phase 8) — Admin-only config, read from the same
  // GET /shift-handover response the Staff page and history grid already
  // use, not a dedicated read endpoint.
  const [defaultStartingCash, setDefaultStartingCash] = useState(0);
  const totalCashToday = defaultStartingCash + paidSalesToday;
  const [showStartingCashModal, setShowStartingCashModal] = useState(false);
  const [startingCashLoading, setStartingCashLoading] = useState(false);
  const [startingCashError, setStartingCashError] = useState("");
  const [startingCashSuccess, setStartingCashSuccess] = useState("");

  // Selecting a Cashier Shift Summary card scopes Drop off/Supply Summary
  // below to exactly that shift's real sales; null = all-time (unscoped).
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  // Separate from selectedShiftId — opens the compact inventory detail
  // modal for one card without disturbing the Drop off/Supply scoping above.
  const [inventoryModalShiftId, setInventoryModalShiftId] = useState<string | null>(null);
  const [dropOffSummary, setDropOffSummary] = useState<SalesBreakdownRow[]>([]);
  const [supplySummary, setSupplySummary] = useState<SalesBreakdownRow[]>([]);
  const [breakdownError, setBreakdownError] = useState("");

  // Shift handover grid — real server-side pagination (previously dumped
  // every handover ever into one unbounded grid, same bug class as
  // Orders/Expenses before Item 6). No filter/search on this view, so no
  // hybrid fallback is needed.
  const {
    page: handoverPage,
    setPage: setHandoverPage,
    totalPages: handoverTotalPages,
    items: handovers,
  } = useServerPage(getShiftHandoversPage, HANDOVERS_PAGE_SIZE, true);

  useEffect(() => {
    async function load() {
      try {
        const today = todayDateInputValue();
        const [withdrawalsData, todaySales] = await Promise.all([
          getWithdrawals(),
          getSalesBreakdown({ dateFrom: today, dateTo: today }),
        ]);
        setWithdrawals(withdrawalsData);
        setPaidSalesToday(todaySales.totalPaidAmount);
        setTodayAverageOrderValue(
          todaySales.paidOrderCount > 0 ? todaySales.totalPaidAmount / todaySales.paidOrderCount : 0
        );
      } catch {
        setLoadError("Unable to load sales data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // Non-critical — the page's other sections still work if this fails;
    // the modal simply shows whatever was last successfully loaded (0 on
    // first failure) rather than blocking the whole page.
    getDefaultStartingCash().then(setDefaultStartingCash).catch(() => {});
  }, []);

  async function handleSaveStartingCash(value: number) {
    setStartingCashLoading(true);
    setStartingCashError("");
    setStartingCashSuccess("");
    try {
      await updateDefaultStartingCash(value);
      setDefaultStartingCash(value);
      setStartingCashSuccess("Default starting cash updated.");
    } catch (err) {
      setStartingCashError(
        err instanceof ApiError ? err.message : "Unable to update default starting cash. Please try again."
      );
    } finally {
      setStartingCashLoading(false);
    }
  }

  // Real per-order-detail breakdown from the backend (GET /orders/sales-
  // breakdown) — not computed from `orders` above, which never carries line
  // items. Refetches whenever the selected shift changes.
  useEffect(() => {
    let cancelled = false;
    getSalesBreakdown(selectedShiftId ? { shiftHandoverId: selectedShiftId } : {})
      .then((data) => {
        if (cancelled) return;
        setDropOffSummary(data.packageBreakdown);
        setSupplySummary(data.supplyBreakdown);
      })
      .catch(() => {
        if (!cancelled) setBreakdownError("Unable to load sales breakdown.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedShiftId]);

  const selectedShift = selectedShiftId ? handovers.find((h) => h.id === selectedShiftId) : undefined;
  const inventoryModalShift = inventoryModalShiftId
    ? handovers.find((h) => h.id === inventoryModalShiftId)
    : undefined;

  async function handleWithdrawSave(data: WithdrawalFormData) {
    setWithdrawSubmitting(true);
    setWithdrawError("");
    try {
      await createWithdrawal({ amount: data.amount, reason: data.reason });
      const refreshed = await getWithdrawals();
      setWithdrawals(refreshed);
      setShowWithdrawModal(false);
    } catch (err) {
      setWithdrawError(
        err instanceof ApiError ? err.message : "Unable to record withdrawal. Please try again."
      );
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-6">Loading sales data...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <AdminStatCard
            label="Total Cash Today"
            value={`₱${totalCashToday.toFixed(2)}`}
            icon={Wallet}
            iconColor="text-green-600 bg-green-100"
          />
          <AdminStatCard
            label="Average Order Value"
            value={`₱${todayAverageOrderValue.toFixed(2)}`}
            icon={TrendingUp}
            iconColor="text-purple-600 bg-purple-100"
          />
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              setStartingCashError("");
              setStartingCashSuccess("");
              setShowStartingCashModal(true);
            }}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 whitespace-nowrap"
            title="Configure the default starting cash used when no previous Shift Handover exists"
          >
            <Settings size={16} />
            Starting Cash
          </button>
          <button
            onClick={() => {
              setWithdrawError("");
              setShowWithdrawModal(true);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
          >
            Cash Withdrawal
          </button>
        </div>
      </div>

      {breakdownError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg py-2 px-3 mb-4">
          {breakdownError}
        </p>
      )}

      {selectedShift && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 mb-4 text-sm">
          <span className="text-blue-800">
            Showing Drop off / Supply Summary for{" "}
            <span className="font-semibold">
              {new Date(selectedShift.timestamp).toLocaleDateString()}
            </span>{" "}
            — {selectedShift.staffName}
          </span>
          <button
            onClick={() => setSelectedShiftId(null)}
            className="text-blue-700 font-medium hover:text-blue-900"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Drop off Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Pack Name</th>
                <th className="p-2 whitespace-nowrap">Qty Sold</th>
                <th className="p-2 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {dropOffSummary.length > 0 ? (
                dropOffSummary.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.totalQuantity}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No drop-off orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Supply Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Item Name</th>
                <th className="p-2 whitespace-nowrap">Qty Sold</th>
                <th className="p-2 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {supplySummary.length > 0 ? (
                supplySummary.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{s.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{s.totalQuantity}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{s.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No supplies sold yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Cashier Shift Summary</h2>
        {handovers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm text-left">
              <thead>
                <tr className="text-gray-700 border-b bg-gray-50">
                  <th className="p-3 whitespace-nowrap">Date</th>
                  <th className="p-3 whitespace-nowrap">Staff</th>
                  <th className="p-3 whitespace-nowrap">Sales</th>
                  <th className="p-3 whitespace-nowrap">Expense</th>
                  <th className="p-3 whitespace-nowrap">Withdrawal</th>
                  <th className="p-3 whitespace-nowrap">Expected</th>
                  <th className="p-3 whitespace-nowrap">Actual</th>
                  <th className="p-3 whitespace-nowrap">Shortage</th>
                  <th className="p-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((h) => {
                  const isSelected = h.id === selectedShiftId;
                  const totalSales = h.laundrySales + h.supplySales + (h.customServiceSales ?? 0);
                  return (
                    <tr
                      key={h.id}
                      onClick={() => setSelectedShiftId(isSelected ? null : h.id)}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap text-gray-900">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-gray-900">{h.staffName}</td>
                      <td className="p-3 whitespace-nowrap text-gray-900">₱{totalSales.toFixed(2)}</td>
                      <td className="p-3 whitespace-nowrap text-gray-900">₱{h.expense.toFixed(2)}</td>
                      <td className="p-3 whitespace-nowrap text-gray-900">₱{h.withdrawals.toFixed(2)}</td>
                      <td className="p-3 whitespace-nowrap text-gray-900">₱{h.expectedCash.toFixed(2)}</td>
                      <td className="p-3 whitespace-nowrap text-gray-900">₱{h.actualCashCounted.toFixed(2)}</td>
                      <td className={`p-3 whitespace-nowrap font-medium ${h.shortage < 0 ? "text-red-600" : "text-green-600"}`}>
                        ₱{h.shortage.toFixed(2)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInventoryModalShiftId(h.id);
                          }}
                          className="text-blue-600 font-medium hover:text-blue-800"
                        >
                          Inventory
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No shift handovers submitted yet.</p>
        )}
        <Pagination page={handoverPage} totalPages={handoverTotalPages} onPageChange={setHandoverPage} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Withdrawal History</h2>
        {withdrawError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {withdrawError}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Date</th>
                <th className="p-2 whitespace-nowrap">Time</th>
                <th className="p-2 whitespace-nowrap">Admin</th>
                <th className="p-2 whitespace-nowrap">Amount</th>
                <th className="p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length > 0 ? (
                withdrawals.map((w) => (
                  <tr key={w.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      {new Date(w.timestamp).toLocaleDateString()}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      {new Date(w.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{w.adminName}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{w.amount.toFixed(2)}</td>
                    <td className="p-2 text-gray-900">{w.reason}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    No withdrawals recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWithdrawModal && (
        <AdminWithdrawalFormModal
          onSave={handleWithdrawSave}
          onCancel={() => setShowWithdrawModal(false)}
          submitting={withdrawSubmitting}
          submitError={withdrawError}
        />
      )}

      {inventoryModalShift && (
        <ShiftInventoryModal
          staffName={inventoryModalShift.staffName}
          timestamp={inventoryModalShift.timestamp}
          rows={inventoryModalShift.inventorySnapshot ?? []}
          totalSales={
            inventoryModalShift.laundrySales +
            inventoryModalShift.supplySales +
            (inventoryModalShift.customServiceSales ?? 0)
          }
          onClose={() => setInventoryModalShiftId(null)}
        />
      )}

      {showStartingCashModal && (
        <DefaultStartingCashModal
          currentValue={defaultStartingCash}
          loading={startingCashLoading}
          error={startingCashError}
          success={startingCashSuccess}
          onSave={handleSaveStartingCash}
          onClose={() => setShowStartingCashModal(false)}
        />
      )}
    </div>
  );
}
