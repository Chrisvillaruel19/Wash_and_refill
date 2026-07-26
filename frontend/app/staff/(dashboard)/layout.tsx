"use client";

import { useRequireStaff } from "@/app/lib/useRequireStaff";
import Sidebar from "@/app/components/staffcom/Sidebar";
import PageHeader from "@/app/components/staffcom/PageHeader";

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checking } = useRequireStaff();

  if (checking) {
    return <p className="p-6 text-gray-400">Checking access...</p>;
  }

  return (
    <div className="flex min-h-screen bg-sky-50">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <PageHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}