import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  href?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor, href }: StatCardProps) {
  const content = (
   <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center justify-between gap-3">
    <div className="min-w-0">
        <p className="text-gray-500 text-xs sm:text-sm truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1 truncate">{value}</p>
    </div>
    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon size={18} className="sm:hidden" />
        <Icon size={20} className="hidden sm:block" />
    </div>
</div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}