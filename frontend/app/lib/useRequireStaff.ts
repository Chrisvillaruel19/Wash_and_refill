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
    if (!current || current.role !== "staff") {
      router.replace("/");
      return;
    }
    setUser(current);
    setChecking(false);
  }, [router]);

  return { user, checking };
}
