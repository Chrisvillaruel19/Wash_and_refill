"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, StaffUser } from "../../lib/auth";
import ProfileMenu from "../ProfileMenu";

export default function AdminPageHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
  }, []);

  const pageTitles: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/employee": "Employees",
    "/admin/catalog": "Catalog",
    "/admin/claim_monitoring": "Laundry Monitoring",
    "/admin/archive": "Archived",
    "/admin/logs": "Logs monitoring",
    "/admin/sales": "Sales Summary",
    "/admin/attendance": "Attendance",
    "/admin/customers": "Customers",
    "/admin/expenses": "Expenses",
  };

  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 shadow-md px-4 sm:px-8 py-4 sm:py-5">
      <h1 className="text-xl sm:text-3xl font-bold text-gray-800 ml-12 md:ml-0">
        {title}
      </h1>

      <ProfileMenu name={user?.name ?? "Guest"} role={user?.role ?? "admin"} />
    </header>
  );
}
