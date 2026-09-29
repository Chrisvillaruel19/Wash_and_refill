import type { ReactNode } from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  href?: string;
  // Optional second line under the value (e.g. a breakdown or comparison).
  sub?: ReactNode;
  // Overrides the value's text colour (e.g. red when something needs attention).
  valueClassName?: string;
}

export default function AdminStatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  href,
  sub,
  valueClassName = "text-gray-800",
}: AdminStatCardProps) {
  const content = (
    <div
      className={`bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-start justify-between gap-3 h-full ${
        href ? "hover:shadow-lg hover:ring-1 hover:ring-blue-200 transition-shadow" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-gray-500 text-xs sm:text-sm truncate">{label}</p>
        <p className={`text-lg sm:text-2xl font-bold mt-1 truncate tabular-nums ${valueClassName}`}>{value}</p>
        {sub && <div className="text-xs text-gray-500 mt-1 leading-snug">{sub}</div>}
      </div>
      {/* Hidden on phones — in a half-width card the amount needs the room more than the icon. */}
      <div
        className={`hidden sm:flex w-10 h-10 rounded-full items-center justify-center shrink-0 self-start ${iconColor}`}
      >
        <Icon size={20} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer h-full">
        {content}
      </Link>
    );
  }

  return content;
}
