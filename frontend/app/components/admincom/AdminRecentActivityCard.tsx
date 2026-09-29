"use client";

import CardHeader from "./dashboard/CardHeader";
import {
  Boxes,
  Clock,
  LucideIcon,
  Pencil,
  Receipt,
  ShoppingBag,
  UserCog,
  Wallet,
} from "lucide-react";
import { ActivityLog } from "../../staff/(dashboard)/types";

interface AdminRecentActivityCardProps {
  logs: ActivityLog[];
  // null hides the link (Staff has no Logs page).
  logsHref?: string | null;
}

const MODULE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  Order: { icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
  Expense: { icon: Receipt, color: "text-orange-600 bg-orange-50" },
  Customer: { icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
  Inventory: { icon: Boxes, color: "text-purple-600 bg-purple-50" },
  Package: { icon: Boxes, color: "text-purple-600 bg-purple-50" },
  LaundryService: { icon: Boxes, color: "text-purple-600 bg-purple-50" },
  Attendance: { icon: Clock, color: "text-green-600 bg-green-50" },
  ShiftHandover: { icon: Wallet, color: "text-teal-600 bg-teal-50" },
  DrawerState: { icon: Wallet, color: "text-teal-600 bg-teal-50" },
  Withdrawal: { icon: Wallet, color: "text-teal-600 bg-teal-50" },
  Employee: { icon: UserCog, color: "text-gray-700 bg-gray-100" },
};
const DEFAULT_ICON = { icon: Pencil, color: "text-gray-600 bg-gray-100" };

// Kept as-is when they appear in upper case — real acronyms, not enum names.
const KEEP_UPPER = new Set(["PIN", "ID", "OK"]);
const SPECIAL_WORDS: Record<string, string> = { GCASH: "GCash" };

// Audit descriptions embed raw enum names ("SUPPLIES_AND_MATERIALS",
// "from IN_PROGRESS to READY") — turn them into readable text.
function humanize(message: string) {
  return message
    .replace(/from ([A-Z_]{3,}) to ([A-Z_]{3,})/g, "$1 → $2")
    .replace(/\b[A-Z][A-Z_]{2,}\b/g, (token) => {
      if (KEEP_UPPER.has(token)) return token;
      if (SPECIAL_WORDS[token]) return SPECIAL_WORDS[token];
      const words = token
        .split("_")
        .filter(Boolean)
        .map((w) => (w === "AND" ? "&" : w.charAt(0) + w.slice(1).toLowerCase()));
      return words.join(" ");
    });
}

function dayHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// Latest entries only (the backend returns the 10 most recent), grouped by
// day with times — no inner scroll box, which is awkward on phones; the full
// history lives on the Logs page.
export default function AdminRecentActivityCard({ logs, logsHref = "/admin/logs" }: AdminRecentActivityCardProps) {
  const groups: { heading: string; items: ActivityLog[] }[] = [];
  for (const log of logs) {
    const heading = dayHeading(log.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(log);
    else groups.push({ heading, items: [log] });
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <CardHeader title="Recent activity" linkHref={logsHref ?? undefined} linkLabel="View all logs" />

      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group.heading}</p>
              <ul className="space-y-3">
                {group.items.map((log) => {
                  const { icon: Icon, color } = (log.module && MODULE_ICONS[log.module]) || DEFAULT_ICON;
                  return (
                    <li key={log.id} className="flex items-start gap-3 text-sm">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                        <Icon size={14} />
                      </span>
                      <p className="min-w-0 flex-1 text-gray-700 break-words">{humanize(log.message)}</p>
                      <time className="text-xs text-gray-400 shrink-0 mt-0.5 tabular-nums" dateTime={log.timestamp}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
