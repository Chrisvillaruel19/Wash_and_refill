"use client";

import { useEffect, useState } from "react";
import { Wallet, ClipboardList, AlertTriangle, Users } from "lucide-react";
import AdminStatCard from "../../components/admincom/AdminStatCard";
import AdminRecentActivityCard from "../../components/admincom/AdminRecentActivityCard";
import { getAdminDashboard, getRecentActivity } from "../../lib/services/dashboard.service";
import { ActivityLog } from "../../staff/(dashboard)/types";

export default function AdminDashboardPage() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [totalCashToday, setTotalCashToday] = useState(0);
  const [unclaimedOrders, setUnclaimedOrders] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, inProgress: 0, ready: 0, claimed: 0 });
  const [bestSelling, setBestSelling] = useState<{ name: string; quantitySold: number }[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const dashboard = await getAdminDashboard();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTotalCashToday(dashboard.totalCashToday);
        setUnclaimedOrders(dashboard.unclaimedOrders);
        setStatusCounts(dashboard.statusCounts);
        setBestSelling(dashboard.bestSelling);
        setLowStockCount(dashboard.lowStockCount);
        setEmployeeCount(dashboard.employeeCount);
      } catch {
        setError("Unable to load dashboard data. Please try again.");
        setLoading(false);
        return;
      }

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

  if (error) {
    return <p className="text-red-500 p-6">{error}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <AdminStatCard
          label="Total Cash Today"
          value={`₱${totalCashToday.toFixed(2)}`}
          icon={Wallet}
          iconColor="text-green-600 bg-green-100"
        />
        <AdminStatCard
          label="Total unclaimed orders"
          value={unclaimedOrders}
          icon={ClipboardList}
          iconColor="text-orange-500 bg-orange-100"
          href="/admin/claim_monitoring"
        />
        <AdminStatCard
          label="Low stock items"
          value={lowStockCount}
          icon={AlertTriangle}
          iconColor="text-red-600 bg-red-100"
          href="/admin/catalog"
        />
        <AdminStatCard
          label="Employees"
          value={employeeCount}
          icon={Users}
          iconColor="text-blue-600 bg-blue-100"
          href="/admin/employee"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Pending</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">{statusCounts.pending}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{statusCounts.inProgress}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Ready</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{statusCounts.ready}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Claimed</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">{statusCounts.claimed}</p>
            </div>
          </div>
        </div>

        <AdminRecentActivityCard logs={activity} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Best Selling Packages</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Package Name</th>
                <th className="p-2 whitespace-nowrap">Quantity Sold</th>
              </tr>
            </thead>
            <tbody>
              {bestSelling.length > 0 ? (
                bestSelling.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{p.quantitySold}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-400">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
