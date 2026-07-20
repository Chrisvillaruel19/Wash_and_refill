import { DashboardStats, LowStockItem, ActivityLog, Order } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getDashboardStats(): Promise<DashboardStats> {
    const res= await fetch(`${API_BASE}/dashboard/stats`,{cache: "no-store"});
    if (!res.ok) { throw new Error("Failed to fetch dashboard stats"); }
    return res.json();
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
    const res = await fetch(`${API_BASE}/dashboard/low-stock`, { cache: "no-store" });
    if (!res.ok) { throw new Error("Failed to fetch low stock items"); }
    return res.json();
}

export async function getRecentActivity(): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE}/dashboard/activity`, { cache: "no-store" });
    if (!res.ok) { throw new Error("Failed to fetch recent activity"); }
    return res.json();
}

export async function getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/dashboard/orders`, { cache: "no-store" });
    if (!res.ok) { throw new Error("Failed to fetch orders"); }
    return res.json();
}