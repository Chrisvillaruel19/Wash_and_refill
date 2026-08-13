"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, StaffUser } from "./auth";
import { apiClient, setAccessToken, CURRENT_USER_KEY } from "./apiClient";

// Route guard for the Staff section. Mirrors useRequireAdmin.ts exactly —
// see that file for the full rationale on why the /auth/me call exists
// (localStorage alone is a client-editable snapshot, not proof of role).
export function useRequireStaff(): { user: StaffUser | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const current = getCurrentUser();
      if (!current) {
        router.replace("/");
        return;
      }
      if (current.role !== "staff") {
        // Authenticated, just the wrong role for this route — send them
        // back to their own dashboard, not the login page (which looked
        // like a logout even though the session was still valid).
        router.replace("/admin");
        return;
      }

      try {
        const verified = await apiClient.get<{ role: string }>("/auth/me");
        if (cancelled) return;
        if (verified.role !== "STAFF") {
          // See useRequireAdmin.ts's mirror of this check for why: redirecting
          // based on the local (possibly stale/tampered) role here caused a
          // verified infinite ping-pong with the Admin guard. Force a real
          // logout instead — both guards converge on the same safe fallback.
          setAccessToken(null);
          localStorage.removeItem(CURRENT_USER_KEY);
          router.replace("/");
          return;
        }
      } catch {
        // See useRequireAdmin.ts's mirror of this check — fail closed on
        // any verification failure (expired session, rate limit, network
        // error), not just the one apiClient already redirects for.
        if (cancelled) return;
        router.replace("/");
        return;
      }

      if (cancelled) return;
      setUser(current);
      setChecking(false);
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}
