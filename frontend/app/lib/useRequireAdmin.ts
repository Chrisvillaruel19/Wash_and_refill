"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreSession, StaffUser } from "./auth";

// Route guard for the Admin section. Asks the server who is logged in
// (restoreSession → /auth/me, silently refreshing from the httpOnly session
// cookie when needed), so a reload or a reopened browser keeps a valid
// session instead of bouncing to the login page, and the role used to pick
// the dashboard comes from the server, never from an editable localStorage
// snapshot. Both guards use the same server answer, so a wrong-role user is
// sent to their own dashboard without any redirect ping-pong. UX only —
// every real Admin action is still enforced server-side by requireRole().
export function useRequireAdmin(): { user: StaffUser | null; checking: boolean } {
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
        // Couldn't verify at all (network/server error) — fail closed rather
        // than render the protected shell; the login page re-checks.
        if (!cancelled) router.replace("/");
        return;
      }
      if (cancelled) return;
      if (!verified) {
        router.replace("/");
        return;
      }
      if (verified.role !== "admin") {
        router.replace("/staff");
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
