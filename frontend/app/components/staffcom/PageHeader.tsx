"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, StaffUser } from "../../lib/auth";
import ProfileMenu from "../ProfileMenu";

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
    "/staff/inventory": "Supplies",
    "/staff/expense": "Expense",
    "/staff/attendance": "Attendance",
    "/staff/shifthandover": "Shift Handover",
  };

  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 shadow-md px-4 sm:px-8 py-4 sm:py-5">
      <h1 className="text-xl sm:text-3xl font-bold text-gray-800 ml-12 md:ml-0">
        {title}
      </h1>

      <ProfileMenu name={user?.name ?? "Guest"} role={user?.role ?? "Staff"} />
    </header>
  );
}