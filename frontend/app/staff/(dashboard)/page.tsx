"use client";

import { useEffect, useState } from "react";
import { Wallet, ClipboardCheck, PackageCheck, AlertTriangle } from "lucide-react";
import AdminStatCard from "../../components/admincom/AdminStatCard";
import AdminRecentActivityCard from "../../components/admincom/AdminRecentActivityCard";
import OrderPipelineCard from "../../components/admincom/dashboard/OrderPipelineCard";
import { peso } from "../../components/admincom/dashboard/format";
import LowStockCard from "../../components/staffcom/dashboard/LowStockCard";
import OrdersTable from "../../components/staffcom/dashboard/OrdersTable";
import MyClaimedTodayCard from "../../components/staffcom/dashboard/MyClaimedTodayCard";
import { getOrdersPage, getMyClaimedOrdersToday } from "../../lib/services/ordersApi.service";
import { getStaffDashboard, getRecentActivity, StaffDashboardData } from "../../lib/services/dashboard.service";
import { Order, ActivityLog } from "./types";

// Same card system as the Admin dashboard. Top to bottom (phones stack
// everything in this same order):
//   today's numbers (2×2 on phones, 4 across on desktop)
//   order pipeline  | low stock
//   recent orders
//   my claimed today | recent activity
export default function StaffDashboardPage() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claimedToday, setClaimedToday] = useState<Order[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, orderPage, myClaimedToday] = await Promise.all([
          getStaffDashboard(),
          getOrdersPage(1, 20),
          getMyClaimedOrdersToday(),
        ]);
        setData(dashboard);
        setOrders(orderPage.items);
        setClaimedToday(myClaimedToday);
      } catch {
        setError("Unable to load dashboard data. Please try again.");
        setLoading(false);
        return;
      }

      // Fetched separately so a Recent Activity failure doesn't block the
      // rest of the (already-loaded) dashboard from rendering.
      try {
        setActivity(await getRecentActivity());
      } catch {
        setActivity([]);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-gray-400 p-6">Loading dashboard...</p>;
  }

  if (error || !data) {
    return <p className="text-red-500 p-6">{error || "Unable to load dashboard data."}</p>;
  }

  const lowStockCount = data.lowStock.length;
  const activeOrders = data.pending + data.inProgress + data.ready;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <AdminStatCard
          label="My shift sales"
          value={peso(data.myShiftSales)}
          icon={Wallet}
          iconColor="text-green-600 bg-green-100"
          sub={<span className="block">{data.onShift ? "Your paid orders since clock-in" : "Not clocked in"}</span>}
        />
        <AdminStatCard
          label="Claimed by you"
          value={data.claimedToday}
          icon={ClipboardCheck}
          iconColor="text-gray-700 bg-gray-100"
          sub={<span className="block">Released to customers today</span>}
        />
        <AdminStatCard
          label="Ready to release"
          value={data.ready}
          icon={PackageCheck}
          iconColor="text-blue-600 bg-blue-100"
          href="/staff/service"
          sub={<span className="block">of {activeOrders} active orders</span>}
        />
        <AdminStatCard
          label="Low stock"
          value={lowStockCount}
          icon={AlertTriangle}
          iconColor="text-red-600 bg-red-100"
          href="/staff/inventory"
          valueClassName={lowStockCount > 0 ? "text-red-600" : "text-gray-800"}
          sub={<span className="block">{lowStockCount > 0 ? "Needs restocking" : "All supplies OK"}</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <OrderPipelineCard
          pending={data.pending}
          inProgress={data.inProgress}
          ready={data.ready}
          claimedToday={data.claimedToday}
          href="/staff/service"
          claimedLabel="Claimed by you today"
        />
        <LowStockCard items={data.lowStock} />
      </div>

      <OrdersTable orders={orders} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MyClaimedTodayCard orders={claimedToday} />
        <AdminRecentActivityCard logs={activity} logsHref={null} />
      </div>
    </div>
  );
}
