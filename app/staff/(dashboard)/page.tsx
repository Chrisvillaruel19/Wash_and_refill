"use client";

import { useEffect, useState } from "react";
import { Wallet, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import StatCard from "../../components/staffcom/dashboard/StatCard";
import LowStockCard from "../../components/staffcom/dashboard/LowStockCard";
import RecentActivityCard from "../../components/staffcom/dashboard/RecentActivityCard";
import OrdersTable from "../../components/staffcom/dashboard/OrdersTable";
import { getLowStockItems, getRecentActivity } from "./api";
import { getStoredOrders, computeStatsFromOrders } from "./localOrders";
import { Order, LowStockItem, ActivityLog } from "./types";

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const storedOrders = getStoredOrders();
      const [lowStockData, activityData] = await Promise.all([
        getLowStockItems(),
        getRecentActivity(),
      ]);
      setOrders(storedOrders);
      setLowStock(lowStockData);
      setActivity(activityData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading dashboard...</p>;
  }

  const stats = computeStatsFromOrders(orders);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          label="Today's Sales"
          value={`₱${stats.todaysSales.toFixed(2)}`}
          icon={Wallet}
          iconColor="text-green-600 bg-green-100"
        />
        <StatCard
          label="Claimed today"
          value={stats.claimedToday}
          icon={ClipboardCheck}
          iconColor="text-gray-700 bg-gray-100"
        />
        <StatCard
          label="Ready"
          value={stats.ready}
          icon={CheckCircle2}
          iconColor="text-green-600 bg-green-100"
          href="/staff/service"
        />
        <StatCard
          label="Low stocks alert"
          value={lowStock.length}
          icon={AlertTriangle}
          iconColor="text-red-600 bg-red-100"
          href="/staff/inventory"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LowStockCard items={lowStock} />
        <RecentActivityCard logs={activity} />
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}