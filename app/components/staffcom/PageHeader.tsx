"use client";

import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { getCurrentUser, StaffUser } from "../../lib/auth";

export default function PageHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
  }, []);

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
    <header className="flex items-center justify-between bg-white border-b border-gray-200 shadow-sm px-4 sm:px-8 py-4 sm:py-5">
      <h1 className="text-xl sm:text-3xl font-bold text-gray-800 ml-12 md:ml-0">
        {title}
      </h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <CircleUserRound
          className="w-9 h-9 sm:w-12 sm:h-12 text-[#007CD6] shrink-0"
          strokeWidth={1.8}
        />

        <div>
          <p className="text-sm sm:text-lg font-semibold text-gray-800">
            {user?.name ?? "Guest"}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 capitalize">
            {user?.role ?? "Staff"}
          </p>
        </div>
      </div>
    </header>
  );
}