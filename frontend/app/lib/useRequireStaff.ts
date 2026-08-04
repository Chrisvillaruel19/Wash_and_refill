"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, StaffUser } from "./auth";

// Frontend-only route guard backed by localStorage identity.
// Mirrors useRequireAdmin.ts exactly, checking "staff" instead of "admin".
// Every staff page/layout calls this one hook — when real server sessions
// exist, only this function's body needs to change.
export function useRequireStaff(): { user: StaffUser | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/");
      return;
    }
    if (current.role !== "staff") {
      // Authenticated, just the wrong role for this route — send them back
      // to their own dashboard, not the login page (which looked like a
      // logout even though the session was still valid).
      router.replace("/admin");
      return;
    }
    setUser(current);
    setChecking(false);
  }, [router]);

  return { user, checking };
}
