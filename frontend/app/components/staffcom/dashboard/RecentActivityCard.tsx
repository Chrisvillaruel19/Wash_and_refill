import { ActivityLog } from "../../../staff/(dashboard)/types";
import { Pencil, PlusCircle } from "lucide-react";

interface RecentActivityCardProps {
  logs: ActivityLog[];
}

export default function RecentActivityCard({ logs }: RecentActivityCardProps) {
  return (
   <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Recent activity</h2>

      {logs.length > 0 ? (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-2 text-sm text-gray-700">
              {log.type === "add" ? (
                <PlusCircle size={16} className="mt-0.5 shrink-0" />
              ) : (
                <Pencil size={16} className="mt-0.5 shrink-0" />
              )}
              <span>{log.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm">No recent activity.</p>
      )}
    </div>
  );
}