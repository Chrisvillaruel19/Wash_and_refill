"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { requestLogout } from "../lib/logoutRequest";

// Up to two initials from the display name ("Arnulfo Tagsip" → "AT").
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ name, size }: { name: string; size: "sm" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#0A8BE8] to-[#0062B0] text-white font-semibold shrink-0 ring-2 ring-white shadow-sm ${
        size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 sm:w-10 sm:h-10 text-sm"
      }`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// The account button in the page header. Tapping it opens a small menu
// with Logout — the same logout the sidebar runs (see logoutRequest.ts).
// Phones show only the avatar; the name and role are in the menu.
export default function ProfileMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Closes on a tap/click anywhere else, or Esc.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={`flex items-center gap-2.5 min-h-[44px] cursor-pointer rounded-full pl-1 pr-2 sm:pr-3 py-1 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007CD6] ${
          open ? "bg-sky-50 border-sky-200" : "border-transparent hover:bg-gray-50 hover:border-gray-200"
        }`}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-semibold text-gray-900 max-w-[160px] truncate">{name}</span>
          <span className="block text-xs text-gray-500 capitalize">{role}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden transition duration-150 ease-out ${
          open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-br from-sky-50 to-white">
          <Avatar name={name} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{name}</p>
            <span className="inline-block mt-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-medium px-2 py-0.5 capitalize">
              {role}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-100 p-2">
          <button
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              requestLogout();
            }}
            className="group w-full flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 min-h-[44px] text-left text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:bg-red-50 focus-visible:text-red-600"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-red-100 group-hover:text-red-600">
              <LogOut size={16} />
            </span>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
