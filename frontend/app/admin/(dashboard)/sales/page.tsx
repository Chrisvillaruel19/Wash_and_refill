"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import AdminWithdrawalFormModal, {
  WithdrawalFormData,
} from "../../../components/admincom/AdminWithdrawalFormModal";
import { getOrders } from "../../../lib/services/ordersApi.service";
import { getPackages } from "../../../lib/services/packageApi.service";
import { getShiftHandoversPage } from "../../../lib/services/shiftHandoverApi.service";
import {
  getWithdrawals,
  createWithdrawal,
  WithdrawalRecord,
} from "../../../lib/services/withdrawalApi.service";
import { getTotalCashToday, getDropOffSummary, getAverageOrderValue } from "../../../lib/orderStats";
import { ApiError } from "../../../lib/apiClient";
import { Order } from "../../../staff/(dashboard)/types";
import { Package } from "../../../staff/(dashboard)/neworder/types";
import Pagination from "../../../components/staffcom/Pagination";
import { useServerPage } from "../../../lib/useServerPage";

const HANDOVERS_PAGE_SIZE = 6;

export default function AdminSalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

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
        const [ordersData, packagesData, withdrawalsData] = await Promise.all([
          getOrders(),
          getPackages(),
          getWithdrawals(),
        ]);

        setOrders(ordersData);

        setPackages(packagesData);

        setWithdrawals(withdrawalsData);
      } catch {
        setLoadError("Unable to load sales data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalCashToday = getTotalCashToday(orders);
  const averageOrderValue = getAverageOrderValue(orders);
  // GET /orders (list) deliberately omits order line items to stay lean, so
  // this always returns empty against real data — a known, disclosed gap
  // (see the "Drop off Summary" section below), not a bug in this call.
  const dropOffSummary = getDropOffSummary(orders, packages);

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
            value={`₱${averageOrderValue.toFixed(2)}`}
            icon={TrendingUp}
            iconColor="text-purple-600 bg-purple-100"
          />
        </div>
        <button
          onClick={() => {
            setWithdrawError("");
            setShowWithdrawModal(true);
          }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap self-start sm:self-auto"
        >
          Cash Withdrawal
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Drop off Summary</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
          Per-package sales reporting is pending a dedicated backend endpoint — order line items
          aren&apos;t exposed by the current orders list. This table will populate once that
          endpoint is built.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Pack Name</th>
                <th className="p-2 whitespace-nowrap">Price</th>
                <th className="p-2 whitespace-nowrap">Total orders</th>
                <th className="p-2 whitespace-nowrap">Total price</th>
              </tr>
            </thead>
            <tbody>
              {dropOffSummary.length > 0 ? (
                dropOffSummary.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.price}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.totalOrders}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">₱{p.totalPrice.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">
                    No drop-off orders yet.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {handovers.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-xl p-4 text-sm">
                <p className="text-gray-500">
                  Date:{" "}
                  <span className="text-gray-900 font-medium">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-gray-500">
                  Staff: <span className="text-gray-900 font-medium">{h.staffName}</span>
                </p>
                <p className="text-gray-500">
                  Laundry sales:{" "}
                  <span className="text-gray-900 font-medium">₱{h.laundrySales.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Supply Sales:{" "}
                  <span className="text-gray-900 font-medium">₱{h.supplySales.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Custom Service Sales:{" "}
                  <span className="text-gray-900 font-medium">
                    ₱{(h.customServiceSales ?? 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-gray-500">
                  GCash / Digital:{" "}
                  <span className="text-gray-900 font-medium">₱{(h.digitalSales ?? 0).toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Expense: <span className="text-gray-900 font-medium">₱{h.expense.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Cash drawer:{" "}
                  <span className="text-gray-900 font-medium">₱{h.cashDrawer.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Withdrawal:{" "}
                  <span className="text-gray-900 font-medium">₱{h.withdrawals.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Expected Balance:{" "}
                  <span className="text-gray-900 font-medium">₱{h.expectedCash.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Actual Cash Count:{" "}
                  <span className="text-gray-900 font-medium">₱{h.actualCashCounted.toFixed(2)}</span>
                </p>
                <p className="text-gray-500">
                  Shortage:{" "}
                  <span
                    className={`font-medium ${h.shortage < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    ₱{h.shortage.toFixed(2)}
                  </span>
                </p>
                {h.notes && (
                  <p className="text-gray-500">
                    Notes: <span className="text-gray-900 font-medium">{h.notes}</span>
                  </p>
                )}
              </div>
            ))}
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
    </div>
  );
}
