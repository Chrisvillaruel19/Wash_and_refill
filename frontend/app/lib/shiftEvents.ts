// "Your shift state may have changed — re-check it." Fired after clock-in,
// clock-out and Shift Handover submit, and whenever the backend rejects an
// action because the user isn't on an active shift. useActiveShift listens
// for it, so every Staff page updates without a reload. Plain DOM event so
// non-React code (apiClient) can fire it too.
export const SHIFT_CHANGED_EVENT = "wrlms:shift-changed";

// Matches NO_ACTIVE_SHIFT in the backend's active-shift.util.ts.
export const NO_ACTIVE_SHIFT_REASON = "NO_ACTIVE_SHIFT";

export function notifyShiftChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SHIFT_CHANGED_EVENT));
}
