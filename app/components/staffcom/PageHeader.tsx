"use client";

import { CircleUserRound } from "lucide-react";
import { usePathname } from "next/navigation";

export default function PageHeader() {
  const pathname = usePathname();

  const pageTitles: Record<string, string> = {
    "/staff": "Dashboard",
    "/staff/neworder": "New Order",
    "/staff/service": "Service",
    "/staff/sales": "Sales",
    "/staff/inventory": "Inventory",
    "/staff/expense": "Expense",
    "/staff/attendance": "Attendance",
    "/staff/shifthandover": "Shift Handover",
  };

  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 shadow-sm px-8 py-5">
      <h1 className="text-3xl font-bold text-gray-800">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <CircleUserRound
          className="w-12 h-12 text-[#007CD6]"
          strokeWidth={1.8}
        />

        <div>
          <p className="text-lg font-semibold text-gray-800">
            Eleno
          </p>
          <p className="text-sm text-gray-500">
            Staff
          </p>
        </div>
      </div>
    </header>
  );
}