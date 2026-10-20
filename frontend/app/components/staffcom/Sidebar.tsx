"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  DollarSign,
  Users,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";

import { logout } from "../../lib/auth";
import { useLogoutRequest } from "../../lib/logoutRequest";
import { alertError } from "../../lib/alerts";
import { ApiError } from "../../lib/apiClient";

const menuItems = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "New Order", href: "/staff/neworder", icon: ShoppingCart },
  { label: "Services", href: "/staff/service", icon: ClipboardList },
  { label: "Sales", href: "/staff/sales", icon: DollarSign },
  { label: "Supplies", href: "/staff/inventory", icon: Package },
  { label: "Expenses", href: "/staff/expense", icon: DollarSign },
  { label: "Shift Handover", href: "/staff/shifthandover", icon: Users },
  { label: "Attendance", href: "/staff/attendance", icon: CalendarDays },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreportedModal, setUnreportedModal] = useState(false);
  // Distinct from unreportedModal — "no Shift Handover submitted this
  // shift yet" is a separate gate from "there's unreported paid activity,"
  // checked first server-side (see LogoutService), so it needs its own
  // modal with its own required wording.
  const [shiftHandoverRequiredModal, setShiftHandoverRequiredModal] = useState(false);
  // Handover is done but the shift is still open — Logout never clocks out
  // on the staff member's behalf (see LogoutService).
  const [clockOutRequiredModal, setClockOutRequiredModal] = useState(false);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  // Server-authoritative: logout() is refused while the shift is still open
  // (handover missing, unreported activity, or not clocked out — see
  // LogoutService) and throws rather than clearing local state, so this is
  // not just a frontend confirmation the backend could be bypassed on.
  async function handleLogout() {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await logout();
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Three distinct 409 causes, distinguished by message text (see
        // LogoutService) — each keyword appears in exactly one message.
        if (/clock out/i.test(err.message)) {
          setClockOutRequiredModal(true);
        } else if (/unreported/i.test(err.message)) {
          setUnreportedModal(true);
        } else {
          setShiftHandoverRequiredModal(true);
        }
      } else {
        // A genuine network/server failure — logout() already re-threw
        // rather than clearing local state, so the user is still
        // authenticated here; surface this rather than pretending success.
        alertError(
          "Unable to log out",
          err instanceof ApiError ? err.message : "Please check your connection and try again."
        );
      }
    } finally {
      isLoggingOutRef.current = false;
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

      {unreportedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unreported Activity</h3>
            <p className="text-sm text-gray-600 mb-5">
              You have unreported orders or expenses since your last Shift Handover. Submit a Shift
              Handover before logging out.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUnreportedModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setUnreportedModal(false);
                  router.push("/staff/shifthandover");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Shift Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {clockOutRequiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clock Out Required</h3>
            <p className="text-sm text-gray-600 mb-5">
              Your shift is still open. Please clock out on the Attendance page before logging out.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setClockOutRequiredModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setClockOutRequiredModal(false);
                  router.push("/staff/attendance");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {shiftHandoverRequiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Shift Handover Required</h3>
            <p className="text-sm text-gray-600 mb-5">
              Please complete and submit your Shift Handover before logging out.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShiftHandoverRequiredModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShiftHandoverRequiredModal(false);
                  router.push("/staff/shifthandover");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Shift Handover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}