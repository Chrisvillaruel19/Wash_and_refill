"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, StaffUser } from "./auth";

// Frontend-only route guard backed by localStorage identity.
// Every admin page/layout calls this one hook — when real server
// sessions exist, only this function's body needs to change.
export function useRequireAdmin(): { user: StaffUser | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current || current.role !== "admin") {
      router.replace("/");
      return;
    }
    setUser(current);
    setChecking(false);
  }, [router]);

  return { user, checking };
}
