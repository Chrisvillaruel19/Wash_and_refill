"use client";

import { useEffect, useRef } from "react";

// The header's profile menu asks the sidebar to log out, so there's exactly
// one logout flow per side (Staff: handover / clock-out prompts; Admin: its
// error alert) no matter which Logout button was pressed.
const LOGOUT_REQUEST_EVENT = "wrlms:logout-request";

export function requestLogout() {
  window.dispatchEvent(new Event(LOGOUT_REQUEST_EVENT));
}

// Runs `onLogout` whenever any Logout button requests it.
export function useLogoutRequest(onLogout: () => void) {
  const handlerRef = useRef(onLogout);
  useEffect(() => {
    handlerRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    const run = () => handlerRef.current();
    window.addEventListener(LOGOUT_REQUEST_EVENT, run);
    return () => window.removeEventListener(LOGOUT_REQUEST_EVENT, run);
  }, []);
}
