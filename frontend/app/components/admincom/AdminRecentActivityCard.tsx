"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityLog } from "../../staff/(dashboard)/types";
import { Pencil, PlusCircle } from "lucide-react";
import ExpandableText from "../staffcom/ExpandableText";

interface AdminRecentActivityCardProps {
  logs: ActivityLog[];
}

export default function AdminRecentActivityCard({ logs }: AdminRecentActivityCardProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    setHasOverflow(!!el && el.scrollHeight > el.clientHeight);
  }, [logs]);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Recent activity</h2>

      {logs.length > 0 ? (
        <div className="relative">
          <ul ref={scrollRef} className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-2 text-sm text-gray-700">
                {log.type === "add" ? (
                  <PlusCircle size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <Pencil size={16} className="mt-0.5 shrink-0" />
                )}
                <ExpandableText text={log.message} className="min-w-0 flex-1" />
              </li>
            ))}
          </ul>
          {hasOverflow && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent rounded-b-xl" />
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No recent activity.</p>
      )}
    </div>
  );
}
