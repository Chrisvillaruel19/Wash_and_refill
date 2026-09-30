"use client";

import { useEffect, useState } from "react";
import { Wallet, Receipt, PackageCheck, AlertTriangle } from "lucide-react";
import AdminStatCard from "../../components/admincom/AdminStatCard";
import AdminRecentActivityCard from "../../components/admincom/AdminRecentActivityCard";
import OrderPipelineCard from "../../components/admincom/dashboard/OrderPipelineCard";
import StaffOnDutyCard from "../../components/admincom/dashboard/StaffOnDutyCard";
import SalesTrendChart from "../../components/admincom/dashboard/SalesTrendChart";
import BestSellersCard from "../../components/admincom/dashboard/BestSellersCard";
import { peso } from "../../components/admincom/dashboard/format";
import { AdminDashboardData, getAdminDashboard, getRecentActivity } from "../../lib/services/dashboard.service";
import { ActivityLog } from "../../staff/(dashboard)/types";

// Layout, top to bottom (phones stack everything in this same order):
//   today's numbers (2×2 on phones, 4 across on desktop)
//   order pipeline | staff on duty
//   7-day sales    | best sellers
//   recent activity
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // Activity is non-essential — the dashboard still renders if it fails.
      const [dashboard, logs] = await Promise.allSettled([getAdminDashboard(), getRecentActivity()]);
      if (dashboard.status === "fulfilled") setData(dashboard.value);
      else setError("Unable to load dashboard data. Please try again.");
      setActivity(logs.status === "fulfilled" ? logs.value : []);
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

  const { pending, inProgress, ready, claimed } = data.statusCounts;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <AdminStatCard
          label="Total sales today"
          value={peso(data.totalCashToday)}
          icon={Wallet}
          iconColor="text-green-600 bg-green-100"
          href="/admin/sales"
        />
        <AdminStatCard
          label="Total expenses today"
          value={peso(data.expensesToday)}
          icon={Receipt}
          iconColor="text-orange-500 bg-orange-100"
          href="/admin/expenses"
        />
        <AdminStatCard
          label="Ready to release"
          value={ready}
          icon={PackageCheck}
          iconColor="text-blue-600 bg-blue-100"
          href="/admin/claim_monitoring"
          sub={<span className="block">of {data.unclaimedOrders} active orders</span>}
        />
        <AdminStatCard
          label="Low stock"
          value={data.lowStockCount}
          icon={AlertTriangle}
          iconColor="text-red-600 bg-red-100"
          href="/admin/catalog"
          valueClassName={data.lowStockCount > 0 ? "text-red-600" : "text-gray-800"}
          sub={
            <span className="block">
              {data.lowStockCount > 0 ? "Needs restocking" : "All supplies OK"}
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <OrderPipelineCard pending={pending} inProgress={inProgress} ready={ready} claimedToday={claimed} />
        <StaffOnDutyCard staff={data.staffOnDuty} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SalesTrendChart days={data.salesLast7Days} />
        <BestSellersCard items={data.bestSelling} />
      </div>

      <AdminRecentActivityCard logs={activity} />
    </div>
  );
}
