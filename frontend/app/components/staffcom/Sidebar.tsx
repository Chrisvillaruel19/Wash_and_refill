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
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { logout } from "../../lib/auth";
import { ApiError } from "../../lib/apiClient";

const menuItems = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "New Order", href: "/staff/neworder", icon: ShoppingCart },
  { label: "Services", href: "/staff/service", icon: ClipboardList },
  { label: "Sales", href: "/staff/sales", icon: DollarSign },
  { label: "inventory", href: "/staff/inventory", icon: Package },
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
  // A genuine network/server failure — logout could not be confirmed, so
  // the user is still authenticated; shown as an inline error rather than
  // a modal, matching the pattern used elsewhere in this app for action
  // errors (e.g. Service page's actionError).
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  // Server-authoritative: logout() itself enforces the unreported-activity
  // rule (mirrors Clock Out's own gate — see LogoutService) and throws
  // specifically for that case rather than clearing local state, so this is
  // not just a frontend confirmation the backend could be bypassed on.
  async function handleLogout() {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Two distinct 409 causes, distinguished by message text (see
        // LogoutService) — "unreported" only ever appears in the existing
        // financial-reconciliation message, never in the Shift Handover
        // Required one.
        if (/unreported/i.test(err.message)) {
          setUnreportedModal(true);
        } else {
          setShiftHandoverRequiredModal(true);
        }
      } else {
        // A genuine network/server failure — logout() already re-threw
        // rather than clearing local state, so the user is still
        // authenticated here; surface this rather than pretending success.
        setLogoutError(
          err instanceof ApiError ? err.message : "Unable to log out. Please check your connection and try again."
        );
      }
    } finally {
      isLoggingOutRef.current = false;
      setLoggingOut(false);
    }
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
        className={`w-56 h-screen md:h-auto md:min-h-screen bg-sky-600 text-white flex flex-col shadow-lg fixed md:static top-0 left-0 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden self-end p-4 text-white shrink-0"
        >
          <X size={22} />
        </button>

        <div className="flex flex-col items-center py-6 border-b border-blue-500 shrink-0">
          <Image
            src="/LOGO.png"
            alt="Logo"
            width={100}
            height={99}
            priority
            className="rounded-full"
          />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto mt-6">
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

        <div className="p-5 border-t border-blue-500 shrink-0">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-center gap-2 w-full bg-sky-700 hover:bg-sky-800 py-3 rounded-lg transition disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
          {logoutError && <p className="text-red-100 text-sm mt-2">{logoutError}</p>}
        </div>
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