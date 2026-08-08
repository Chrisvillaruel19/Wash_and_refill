import { apiClient } from "../apiClient";
import { ActivityLog, LowStockItem } from "../../staff/(dashboard)/types";

interface BackendLowStockItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
}

function mapLowStockItem(item: BackendLowStockItem): LowStockItem {
  return { id: item.id, name: item.itemName, quantityRemaining: item.quantity, unit: item.unit };
}

export interface StaffDashboardData {
  todaysSales: number;
  claimedToday: number;
  ready: number;
  lowStock: LowStockItem[];
}

export async function getStaffDashboard(): Promise<StaffDashboardData> {
  const result = await apiClient.get<{
    todaysSales: number;
    claimedToday: number;
    ready: number;
    lowStockItems: BackendLowStockItem[];
  }>("/dashboard/staff");

  return {
    todaysSales: Number(result.todaysSales),
    claimedToday: result.claimedToday,
    ready: result.ready,
    lowStock: result.lowStockItems.map(mapLowStockItem),
  };
}

export interface AdminDashboardData {
  totalCashToday: number;
  unclaimedOrders: number;
  statusCounts: { pending: number; inProgress: number; ready: number; claimed: number };
  bestSelling: { name: string; quantitySold: number }[];
  lowStockCount: number;
  employeeCount: number;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const result = await apiClient.get<{
    totalSales: number;
    unclaimedOrders: number;
    orderStatusCounts: { pending: number; inProgress: number; ready: number; claimed: number };
    bestSellingPackages: { name: string; quantitySold: number }[];
    lowStockCount: number;
    employeeCount: number;
  }>("/dashboard/admin");

  return {
    totalCashToday: Number(result.totalSales),
    unclaimedOrders: result.unclaimedOrders,
    statusCounts: result.orderStatusCounts,
    bestSelling: result.bestSellingPackages,
    lowStockCount: result.lowStockCount,
    employeeCount: result.employeeCount,
  };
}

interface BackendActivityLog {
  id: string;
  action: string;
  module: string;
  description: string | null;
  createdAt: string;
  performedBy: string;
}

// Only two things the display components actually use: log.type === "add"
// (picks an icon) and log.message (the rendered text) — verified directly
// against RecentActivityCard/AdminRecentActivityCard before writing this.
function mapActivityLog(log: BackendActivityLog): ActivityLog {
  return {
    id: log.id,
    type: log.action === "CREATE" ? "add" : "update",
    message: log.description ?? `${log.performedBy} performed ${log.action} on ${log.module}`,
    timestamp: log.createdAt,
  };
}

export async function getRecentActivity(): Promise<ActivityLog[]> {
  const result = await apiClient.get<{ activity: BackendActivityLog[] }>("/dashboard/activity");
  return result.activity.map(mapActivityLog);
}
