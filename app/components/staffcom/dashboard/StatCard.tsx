import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor }: StatCardProps) {
 return ( <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
            <Icon size={20} />
        </div>
  </div>)
}
