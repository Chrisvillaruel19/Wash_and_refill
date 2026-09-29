"use client";

import { useEffect } from "react";

// Registers /sw.js (offline fallback page only — see public/sw.js).
// Production builds only: in `npm run dev` a service worker can serve
// stale pages while code is being edited.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app works the same without it, just no offline page.
    });
  }, []);

  return null;
}
