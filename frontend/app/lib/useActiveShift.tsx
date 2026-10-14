"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getActiveShift } from "./services/attendanceApi.service";
import { SHIFT_CHANGED_EVENT } from "./shiftEvents";
import { alertWarning } from "./alerts";

// The Staff portal's one view of "may this user do operational work right
// now?" — read from the backend (GET /attendance/active), never from
// localStorage. It is only a UX layer: the backend's requireActiveShift
// guard is the real security boundary and rejects the action regardless.
//
//   loading      first check not finished yet — actions stay disabled
//   onShift      clocked in, shift not handed over — actions allowed
//   notClockedIn no open attendance session (never clocked in, or clocked out)
//   handedOver   clocked in but this shift's Shift Handover is submitted
//   unknown      the check itself failed (network/server) — actions are left
//                enabled and the server decides, rather than locking a
//                working staff member out over a failed status request
export type ShiftState = "loading" | "onShift" | "notClockedIn" | "handedOver" | "unknown";

const MESSAGES: Record<ShiftState, string> = {
  loading: "Checking your shift status...",
  onShift: "",
  notClockedIn:
    "You are not clocked in. Clock in on the Attendance page to record orders, expenses, restocks or other work.",
  handedOver:
    "You already submitted your Shift Handover for this shift. Please clock out — no more work can be recorded for this shift.",
  unknown: "We couldn't check your shift status. If an action is refused, check your attendance and try again.",
};

interface ActiveShiftValue {
  state: ShiftState;
  canWork: boolean;
  message: string;
  refresh: () => void;
  // Call at the start of an operational action: returns true when allowed,
  // otherwise shows the reason in the app's standard warning dialog.
  ensureCanWork: () => boolean;
}

const ActiveShiftContext = createContext<ActiveShiftValue | null>(null);

export function ActiveShiftProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<ShiftState>("loading");
  // Only the newest request may update state, so a slow, older response
  // can't overwrite a fresher one (e.g. right after clocking out).
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const { onShift, handoverSubmitted } = await getActiveShift();
      if (requestId !== requestIdRef.current) return;
      setState(!onShift ? "notClockedIn" : handoverSubmitted ? "handedOver" : "onShift");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState("unknown");
    }
  }, []);

  // Re-check on every Staff page navigation, so moving between pages never
  // keeps a stale "on shift" from before a clock-out.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [pathname, refresh]);

  // ...and on clock-in/out/handover (or a server-side NO_ACTIVE_SHIFT
  // rejection), and when the tab regains focus (clocked out in another tab).
  useEffect(() => {
    const onChange = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener(SHIFT_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(SHIFT_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const canWork = state === "onShift" || state === "unknown";
  const message = MESSAGES[state];

  const ensureCanWork = useCallback(() => {
    if (canWork) return true;
    alertWarning(state === "loading" ? "Please wait" : "You're not on shift", message);
    return false;
  }, [canWork, state, message]);

  return (
    <ActiveShiftContext.Provider value={{ state, canWork, message, refresh: () => void refresh(), ensureCanWork }}>
      {children}
    </ActiveShiftContext.Provider>
  );
}

export function useActiveShift(): ActiveShiftValue {
  const value = useContext(ActiveShiftContext);
  if (!value) throw new Error("useActiveShift must be used inside ActiveShiftProvider (the Staff layout).");
  return value;
}
