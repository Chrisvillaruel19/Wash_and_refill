"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, StaffUser } from "./auth";
import { apiClient, setAccessToken, CURRENT_USER_KEY } from "./apiClient";

// Route guard for the Admin section. The localStorage check below is only
// an optimistic first pass (fast, avoids a network round-trip before even
// knowing whether *anyone* is logged in) — it's a client-editable snapshot
// from login time, not proof. The real gate is the /auth/me call: it asks
// the backend what role the *verified* access token actually carries, so a
// tampered localStorage value can no longer make the Admin shell render.
// This is defense-in-depth/UX only — every real Admin action was already,
// independently, enforced server-side by requireRole() regardless of what
// this hook decides; that boundary is unchanged.
export function useRequireAdmin(): { user: StaffUser | null; checking: boolean } {
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
      if (current.role !== "admin") {
        // Authenticated, just the wrong role for this route — send them
        // back to their own dashboard, not the login page (which looked
        // like a logout even though the session was still valid).
        router.replace("/staff");
        return;
      }

      try {
        const verified = await apiClient.get<{ role: string }>("/auth/me");
        if (cancelled) return;
        if (verified.role !== "ADMIN") {
          // The server-verified role disagrees with the local snapshot —
          // that snapshot is stale or was tampered with, so it can't be
          // trusted to pick which dashboard to redirect to either
          // (redirecting to "/staff" here caused an infinite ping-pong
          // with useRequireStaff's own mirrored check, verified live: it
          // would see the same untrustworthy "admin" value locally, bounce
          // back to "/admin", forever). Force a real logout instead — both
          // guards converge on the same safe fallback no matter which one
          // catches the mismatch first.
          setAccessToken(null);
          localStorage.removeItem(CURRENT_USER_KEY);
          router.replace("/");
          return;
        }
      } catch {
        // Any failure here — an unrecoverable expired session (apiClient
        // already cleared local state and redirected in that case, see
        // clearStaleAuthState), a rate limit, or a transient network/server
        // error — means the role could not be positively verified. Fail
        // closed rather than rendering the protected shell either way; if
        // apiClient already redirected, this is a harmless repeat of the
        // same destination, not a second, different one.
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
