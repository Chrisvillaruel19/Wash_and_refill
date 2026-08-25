"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Receipt, PiggyBank, Smartphone, BanknoteIcon } from "lucide-react";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import {
  getRevenueTrend,
  getRevenueByCategory,
  getRevenueByStaff,
  getCashVsGcash,
  getExpenseAnalytics,
  getSimplifiedProfit,
  PeriodGrouping,
  RevenueTrendPoint,
  RevenueByCategory,
  RevenueByStaffEntry,
  CashVsGcash,
  ExpenseTrendPoint,
  ExpenseByCategoryEntry,
  ExpenseByStaffEntry,
  SimplifiedProfit,
} from "../../../lib/services/analyticsApi.service";
import { ApiError } from "../../../lib/apiClient";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29); // 30-day window inclusive of today
  return toIsoDate(d);
}

// Lightweight, dependency-free horizontal bar row — this app doesn't use a
// charting library anywhere else, so a real chart lib would be a new
// dependency for one page rather than following existing convention.
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 sm:w-28 shrink-0 text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-gray-900 font-medium">₱{value.toFixed(2)}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [groupBy, setGroupBy] = useState<PeriodGrouping>("day");

  const [profit, setProfit] = useState<SimplifiedProfit | null>(null);
  const [cashVsGcash, setCashVsGcash] = useState<CashVsGcash | null>(null);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [revenueByStaff, setRevenueByStaff] = useState<RevenueByStaffEntry[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseTrend, setExpenseTrend] = useState<ExpenseTrendPoint[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<ExpenseByCategoryEntry[]>([]);
  const [expenseByStaff, setExpenseByStaff] = useState<ExpenseByStaffEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const [profitData, cashData, categoryData, trendData, staffData, expenseData] = await Promise.all([
          getSimplifiedProfit(from, to),
          getCashVsGcash(from, to),
          getRevenueByCategory(from, to),
          getRevenueTrend(from, to, groupBy),
          getRevenueByStaff(from, to),
          getExpenseAnalytics(from, to, groupBy),
        ]);

        setProfit(profitData);
        setCashVsGcash(cashData);
        setRevenueByCategory(categoryData);
        setRevenueTrend(trendData.trend);
        setRevenueByStaff(staffData.byStaff);
        setExpenseTotal(expenseData.totalExpenses);
        setExpenseTrend(expenseData.trend);
        setExpenseByCategory(expenseData.byCategory);
        setExpenseByStaff(expenseData.byStaff);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Unable to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [from, to, groupBy]);

  const maxRevenueTrend = Math.max(0, ...revenueTrend.map((p) => p.revenue));
  const maxExpenseTrend = Math.max(0, ...expenseTrend.map((p) => p.total));
  const maxExpenseCategory = Math.max(0, ...expenseByCategory.map((c) => c.total));
  const maxStaffRevenue = Math.max(0, ...revenueByStaff.map((s) => s.revenue));

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6 bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-from" className="text-sm text-gray-500 whitespace-nowrap">
            From
          </label>
          <input
            id="analytics-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-to" className="text-sm text-gray-500 whitespace-nowrap">
            To
          </label>
          <input
            id="analytics-to"
            type="date"
            value={to}
            min={from}
            max={toIsoDate(new Date())}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-groupby" className="text-sm text-gray-500 whitespace-nowrap">
            Group by
          </label>
          <select
            id="analytics-groupby"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as PeriodGrouping)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 p-6">Loading analytics...</p>
      ) : loadError ? (
        <p className="text-red-500 p-6">{loadError}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <AdminStatCard
              label="Revenue"
              value={`₱${(profit?.revenue ?? 0).toFixed(2)}`}
              icon={TrendingUp}
              iconColor="text-blue-600 bg-blue-100"
            />
            <AdminStatCard
              label="Recorded Expenses"
              value={`₱${(profit?.totalExpenses ?? 0).toFixed(2)}`}
              icon={Receipt}
              iconColor="text-red-600 bg-red-100"
            />
            <AdminStatCard
              label="Simplified Profit"
              value={`₱${(profit?.simplifiedProfit ?? 0).toFixed(2)}`}
              icon={PiggyBank}
              iconColor="text-green-600 bg-green-100"
            />
            <AdminStatCard
              label="Cash Sales"
              value={`₱${(cashVsGcash?.cashSalesTotal ?? 0).toFixed(2)}`}
              icon={BanknoteIcon}
              iconColor="text-emerald-600 bg-emerald-100"
            />
            <AdminStatCard
              label="GCash Sales"
              value={`₱${(cashVsGcash?.gcashSalesTotal ?? 0).toFixed(2)}`}
              icon={Smartphone}
              iconColor="text-sky-600 bg-sky-100"
            />
            <AdminStatCard
              label="Custom Service Sales"
              value={`₱${(revenueByCategory?.customServiceSales ?? 0).toFixed(2)}`}
              icon={Wallet}
              iconColor="text-purple-600 bg-purple-100"
            />
          </div>

          {/* This disclaimer must stay directly beside the Simplified Profit
              figure above, per the audit's explicit requirement — never move
              it somewhere the number could be read without it. */}
          {profit?.label && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-6">
              {profit.label}
            </p>
          )}

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h2>
            {revenueTrend.length > 0 ? (
              <div className="space-y-2">
                {revenueTrend.map((p) => (
                  <BarRow key={p.period} label={p.period} value={p.revenue} max={maxRevenueTrend} color="bg-blue-500" />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No revenue in this period.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue by Category</h2>
              <div className="space-y-2">
                <BarRow
                  label="Laundry"
                  value={revenueByCategory?.laundryEarnings ?? 0}
                  max={revenueByCategory?.totalSales ?? 0}
                  color="bg-blue-500"
                />
                <BarRow
                  label="Supplies"
                  value={revenueByCategory?.supplySales ?? 0}
                  max={revenueByCategory?.totalSales ?? 0}
                  color="bg-purple-500"
                />
                <BarRow
                  label="Custom Service"
                  value={revenueByCategory?.customServiceSales ?? 0}
                  max={revenueByCategory?.totalSales ?? 0}
                  color="bg-amber-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue by Staff</h2>
              {revenueByStaff.length > 0 ? (
                <div className="space-y-2">
                  {revenueByStaff.map((s) => (
                    <BarRow key={s.userId} label={s.name} value={s.revenue} max={maxStaffRevenue} color="bg-green-500" />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No revenue in this period.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Expense Trend</h2>
              <span className="text-sm text-gray-500">Total: ₱{expenseTotal.toFixed(2)}</span>
            </div>
            {expenseTrend.length > 0 ? (
              <div className="space-y-2">
                {expenseTrend.map((p) => (
                  <BarRow key={p.period} label={p.period} value={p.total} max={maxExpenseTrend} color="bg-red-500" />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No expenses in this period.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Expenses by Category</h2>
              {expenseByCategory.length > 0 ? (
                <div className="space-y-2">
                  {expenseByCategory.map((c) => (
                    <BarRow key={c.category} label={c.category} value={c.total} max={maxExpenseCategory} color="bg-orange-500" />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No expenses in this period.</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Expenses by Staff</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-gray-700 border-b bg-gray-50">
                      <th className="p-2 whitespace-nowrap">Staff</th>
                      <th className="p-2 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseByStaff.length > 0 ? (
                      expenseByStaff.map((s) => (
                        <tr key={s.userId} className="border-b last:border-0">
                          <td className="p-2 whitespace-nowrap text-gray-900">{s.name}</td>
                          <td className="p-2 whitespace-nowrap text-gray-900">₱{s.total.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-gray-400">
                          No expenses in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
