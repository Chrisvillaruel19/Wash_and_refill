"use client";

import { useEffect } from "react";

// Number boxes (amounts, counts) change only by typing. Browsers otherwise
// nudge a focused number box by its step when the page is scrolled over it
// or an arrow key is pressed — e.g. Actual Cash Counted silently becoming
// 0.01 while a staff member scrolls down the Shift Handover. One listener
// for the whole app instead of a handler on every field.
export default function NumberInputGuard() {
  useEffect(() => {
    const isFocusedNumberInput = (target: EventTarget | null): target is HTMLInputElement =>
      target instanceof HTMLInputElement && target.type === "number" && document.activeElement === target;

    // Leave the box instead of changing it — the page still scrolls.
    const onWheel = (e: WheelEvent) => {
      if (isFocusedNumberInput(e.target)) e.target.blur();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && isFocusedNumberInput(e.target)) e.preventDefault();
    };

    document.addEventListener("wheel", onWheel, { capture: true, passive: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  return null;
}
