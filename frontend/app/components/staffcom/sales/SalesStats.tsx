import { Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import StatCard from "../dashboard/StatCard";

interface SalesStatsProps {
  totalPending: number;
  totalInProgress: number;
  totalClaimed: number;
}

export default function SalesStats({
  totalPending,
  totalInProgress,
  totalClaimed,
}: SalesStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
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
    </div>
  );
}