"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  DollarSign,
  Users,
  CalendarDays,

  LogOut,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/staff",
    icon: LayoutDashboard,
  },
  {
    label: "New Order",
    href: "/staff/neworder",
    icon: ShoppingCart,
  },
   {
    label: "Services",
    href: "/staff/service",
    icon: ClipboardList,
  },
   {
    label: "Sales",
    href: "/staff/sales",
    icon: DollarSign,
  },
   {
    label: "inventory",
    href: "/staff/inventory",
    icon: Package,
  },

  {
    label: "Expenses",
    href: "/staff/expense",
    icon: DollarSign,
  },
  {
    label: "Shift Handover",
    href: "/staff/shifthandover",
    icon: Users,
  },
  {
    label: "Attendance",
    href: "/staff/attendance",
    icon: CalendarDays,
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-sky-600  text-white flex flex-col shadow-lg">

      
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

      {/* Navigation */}
      <nav className="flex-1 mt-6">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-6 py-4 ${
                isActive
              }`}
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

      {/* Logout */}
      <div className="p-5 border-t border-blue-500">
        <button className="flex items-center justify-center gap-2 w-full bg-sky-700 hover:bg-sky-800 py-3 rounded-lg transition">
          <LogOut size={18} />
          Logout
        </button>
      </div>

    </aside>
  );
}