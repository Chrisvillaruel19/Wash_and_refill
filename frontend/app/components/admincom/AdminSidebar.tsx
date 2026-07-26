"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Archive,
  FileText,
  DollarSign,
  CalendarDays,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { logout } from "../../lib/auth";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Employee", href: "/admin/employee", icon: Users },
  { label: "Catalog", href: "/admin/catalog", icon: Package },
  { label: "Laundry", href: "/admin/claim_monitoring", icon: ClipboardList },
  { label: "Archive", href: "/admin/archive", icon: Archive },
  { label: "Logs", href: "/admin/logs", icon: FileText },
  { label: "Sales", href: "/admin/sales", icon: DollarSign },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarDays },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-sky-600 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      <aside
        className={`w-56 min-h-screen bg-sky-600 text-white flex flex-col shadow-lg fixed md:static top-0 left-0 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden self-end p-4 text-white"
        >
          <X size={22} />
        </button>

        <div className="flex flex-col items-center py-6 border-b border-blue-500">
          <Image
            src="/LOGO.png"
            alt="Logo"
            width={100}
            height={100}
            priority
            className="rounded-full"
          />
        </div>

        <nav className="flex-1 mt-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 px-6 py-4"
              >
                <Icon size={22} />
                <span
                  className={`inline-block ${
                    isActive ? "border-b-2 border-white" : "border-b-2 border-transparent"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-blue-500">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full bg-sky-700 hover:bg-sky-800 py-3 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
