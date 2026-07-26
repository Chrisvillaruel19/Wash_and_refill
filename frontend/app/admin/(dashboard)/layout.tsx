"use client";

import { useRequireAdmin } from "../../lib/useRequireAdmin";
import AdminSidebar from "../../components/admincom/AdminSidebar";
import AdminPageHeader from "../../components/admincom/AdminPageHeader";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checking } = useRequireAdmin();

  if (checking) {
    return <p className="p-6 text-gray-400">Checking access...</p>;
  }

  return (
    <div className="flex min-h-screen bg-sky-50">
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminPageHeader />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
