import { apiClient } from "../apiClient";

export type PeriodGrouping = "day" | "week" | "month";

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
}

export interface RevenueTrend {
  groupBy: PeriodGrouping;
  trend: RevenueTrendPoint[];
}

export interface RevenueByCategory {
  laundryEarnings: number;
  supplySales: number;
  customServiceSales: number;
  totalSales: number;
}

export interface RevenueByStaffEntry {
  userId: string;
  name: string;
  revenue: number;
  orderCount: number;
}

export interface CashVsGcash {
  cashSalesTotal: number;
  gcashSalesTotal: number;
  totalSales: number;
}

export interface ExpenseTrendPoint {
  period: string;
  total: number;
}

export interface ExpenseByCategoryEntry {
  category: string;
  total: number;
}

export interface ExpenseByStaffEntry {
  userId: string;
  name: string;
  total: number;
}

export interface ExpenseAnalytics {
  groupBy: PeriodGrouping;
  totalExpenses: number;
  trend: ExpenseTrendPoint[];
  byCategory: ExpenseByCategoryEntry[];
  byStaff: ExpenseByStaffEntry[];
}

export interface SimplifiedProfit {
  revenue: number;
  totalExpenses: number;
  simplifiedProfit: number;
  // Always render this alongside the number — see backend
  // SIMPLIFIED_PROFIT_LABEL (simplified-profit.service.ts): this figure
  // deliberately excludes cost of goods, discounts, and refunds.
  label: string;
}

function qs(from: string, to: string, groupBy?: PeriodGrouping): string {
  const params = new URLSearchParams({ from, to });
  if (groupBy) params.set("groupBy", groupBy);
  return params.toString();
}

export async function getRevenueTrend(
  from: string,
  to: string,
  groupBy: PeriodGrouping
): Promise<RevenueTrend> {
  return apiClient.get(`/analytics/revenue/trend?${qs(from, to, groupBy)}`);
}

export async function getRevenueByCategory(from: string, to: string): Promise<RevenueByCategory> {
  return apiClient.get(`/analytics/revenue/by-category?${qs(from, to)}`);
}

export async function getRevenueByStaff(from: string, to: string): Promise<{ byStaff: RevenueByStaffEntry[] }> {
  return apiClient.get(`/analytics/revenue/by-staff?${qs(from, to)}`);
}

export async function getCashVsGcash(from: string, to: string): Promise<CashVsGcash> {
  return apiClient.get(`/analytics/cash-vs-gcash?${qs(from, to)}`);
}

export async function getExpenseAnalytics(
  from: string,
  to: string,
  groupBy: PeriodGrouping
): Promise<ExpenseAnalytics> {
  return apiClient.get(`/analytics/expenses?${qs(from, to, groupBy)}`);
}

export async function getSimplifiedProfit(from: string, to: string): Promise<SimplifiedProfit> {
  return apiClient.get(`/analytics/profit?${qs(from, to)}`);
}
