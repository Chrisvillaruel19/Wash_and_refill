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
  Receipt,
  CalendarDays,
  Menu,
  X,
  Contact,
} from "lucide-react";

import { logout } from "../../lib/auth";
import { useLogoutRequest } from "../../lib/logoutRequest";
import { ApiError } from "../../lib/apiClient";
import { alertError } from "../../lib/alerts";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Employee", href: "/admin/employee", icon: Users },
  { label: "Catalog", href: "/admin/catalog", icon: Package },
  { label: "Laundry", href: "/admin/claim_monitoring", icon: ClipboardList },
  { label: "Customers", href: "/admin/customers", icon: Contact },
  { label: "Archive", href: "/admin/archive", icon: Archive },
  { label: "Logs", href: "/admin/logs", icon: FileText },
  { label: "Sales", href: "/admin/sales", icon: DollarSign },
  { label: "Expenses", href: "/admin/expenses", icon: Receipt },
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

  // Waits for the server: leaving the page while the logout request was
  // still in flight let the login page find the still-valid session and
  // bounce back into /admin, and a refused logout (e.g. 409 — an open
  // attendance shift) was silently ignored, leaving a half-logged-out state.
  const [loggingOut, setLoggingOut] = useState(false);
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/");
    } catch (err) {
      alertError("Unable to log out", err instanceof ApiError ? err.message : "Please check your connection and try again.");
    } finally {
      setLoggingOut(false);
    }
  }
  // Logout lives in the header's profile menu, which runs this flow.
  useLogoutRequest(handleLogout);

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
        className={`w-56 h-screen bg-sky-600 text-white flex flex-col shadow-lg fixed md:sticky md:self-start shrink-0 top-0 left-0 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden self-end p-4 text-white shrink-0"
        >
          <X size={22} />
        </button>

        <div className="flex flex-col items-center py-5 mx-4 border-b border-white/15 shrink-0">
          <Image
            src="/LOGO.png"
            alt="Logo"
            width={84}
            height={83}
            priority
            className="rounded-full shadow-md ring-2 ring-white/30"
          />
        </div>

        {/* Pinned on desktop; the list scrolls on its own (thin, blended
            scrollbar) only when the screen is shorter than the menu. */}
        <nav className="sidebar-scroll flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                  isActive
                    ? "bg-white/20 text-white font-semibold ring-1 ring-white/30 shadow-sm"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
