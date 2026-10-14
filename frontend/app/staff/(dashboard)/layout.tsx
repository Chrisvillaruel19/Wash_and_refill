"use client";

import { useRequireStaff } from "@/app/lib/useRequireStaff";
import Sidebar from "@/app/components/staffcom/Sidebar";
import PageHeader from "@/app/components/staffcom/PageHeader";
import { ActiveShiftProvider } from "@/app/lib/useActiveShift";
import EmailVerificationNotice from "@/app/components/EmailVerificationNotice";

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checking, user } = useRequireStaff();

  if (checking) {
    return <p className="p-6 text-gray-400">Checking access...</p>;
  }

  return (
    <ActiveShiftProvider>
    <div className="flex min-h-screen bg-sky-50">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <PageHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <EmailVerificationNotice emailVerified={user?.emailVerified} />
          {children}
        </div>
      </main>
    </div>
    </ActiveShiftProvider>
  );
}