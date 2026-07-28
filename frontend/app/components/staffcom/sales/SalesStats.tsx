import { Clock, RefreshCw, CheckCircle2, Wallet } from "lucide-react";
import StatCard from "../dashboard/StatCard";

interface SalesStatsProps {
  totalPending: number;
  totalInProgress: number;
  totalClaimed: number;
  averageOrderValue: number;
}

export default function SalesStats({
  totalPending,
  totalInProgress,
  totalClaimed,
  averageOrderValue,
}: SalesStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
      <StatCard
        label="Total pending"
        value={totalPending}
        icon={Clock}
        iconColor="text-orange-500 bg-orange-100"
      />
      <StatCard
        label="Total In Progress"
        value={totalInProgress}
        icon={RefreshCw}
        iconColor="text-blue-600 bg-blue-100"
      />
      <StatCard
        label="Total claimed"
        value={totalClaimed}
        icon={CheckCircle2}
        iconColor="text-green-600 bg-green-100"
      />
      <StatCard
        label="Average order value"
        value={`₱${averageOrderValue.toFixed(2)}`}
        icon={Wallet}
        iconColor="text-purple-600 bg-purple-100"
      />
    </div>
  );
}