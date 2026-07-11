import { Wallet, ClipboardCheck, CheckCircle2, AlertTriangle,CircleUserRound } from "lucide-react";
import StatCard from "../../components/staffcom/dashboard/StatCard";
import LowStockCard from "../../components/staffcom/dashboard/LowStockCard";
import RecentActivityCard from "../../components/staffcom/dashboard/RecentActivityCard";
import OrdersTable from "../../components/staffcom/dashboard/OrdersTable";
import {
  getDashboardStats,
  getLowStockItems,
  getRecentActivity,
  getOrders,
} from "./api";

export default async function StaffDashboardPage() {
  const [stats, lowStock, activity, orders] = await Promise.all([
    getDashboardStats(),
    getLowStockItems(),
    getRecentActivity(),
    getOrders(),
  ]);

  return (
    <div>
   <div className="-mx-6 -mt-6 mb-6 px-6 py-5 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
  <h1 className="text-2xl font-bold text-gray-800">
    Dashboard
  </h1>

  <div className="flex items-center gap-3">
    <CircleUserRound className="w-12 h-12 text-blue-500" />

    <div>
      <p className="text-xl font-medium text-gray-800">Eleno</p>
      <p className="text-sm text-gray-500">Staff</p>
    </div>
  </div>
</div>
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
        />
        <StatCard
          label="Low stocks alert"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          iconColor="text-red-600 bg-red-100"
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