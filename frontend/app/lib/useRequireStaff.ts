"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreSession, StaffUser } from "./auth";

// Route guard for the Staff section. Mirrors useRequireAdmin.ts exactly —
// see that file for why the session is restored from the server
// (restoreSession → /auth/me) instead of trusting localStorage.
export function useRequireStaff(): { user: StaffUser | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      let verified: StaffUser | null;
      try {
        verified = await restoreSession();
      } catch {
        if (!cancelled) router.replace("/");
        return;
      }
      if (cancelled) return;
      if (!verified) {
        router.replace("/");
        return;
      }
      if (verified.role !== "staff") {
        router.replace("/admin");
        return;
      }
      setUser(verified);
      setChecking(false);
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}
