"use client";

import { useEffect } from "react";

// Shared by every modal in the app — closes on Escape, matching standard
// dialog keyboard behavior. Pass the modal's own cancel/close handler.
export function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}
