"use client";

import { useEffect, useRef } from "react";

// Re-runs `refresh` every `intervalMs` while the tab is visible, and right
// away when the user comes back to the tab — so changes made elsewhere (an
// Admin refund, a coworker's order) show up without pressing reload. Not
// live push: at most `intervalMs` behind. Skips while the tab is hidden.
export function useAutoRefresh(refresh: () => void, intervalMs = 30_000) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    const timer = setInterval(run, intervalMs);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [intervalMs]);
}
