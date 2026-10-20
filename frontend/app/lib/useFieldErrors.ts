"use client";

import { useState } from "react";

// Per-field validation messages for a form: each message is shown under its
// own input (see components/FieldError.tsx), never in one banner above the
// form. `idPrefix` keeps the error element ids unique per form.
export function useFieldErrors<F extends string>(idPrefix: string) {
  const [errors, setErrorsState] = useState<Partial<Record<F, string>>>({});

  // Replaces every message at once; returns true when there were none.
  function setErrors(next: Partial<Record<F, string>>) {
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Partial<Record<F, string>>;
    setErrorsState(cleaned);
    return Object.keys(cleaned).length === 0;
  }

  // Call from the field's onChange so its message goes away while fixing it.
  function clear(field: F) {
    setErrorsState((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  const errorId = (field: F) => `${idPrefix}-${field}-error`;

  // Spread onto the <input>: red border plus the screen-reader link.
  function inputProps(field: F, baseClass: string) {
    const message = errors[field];
    return {
      "aria-invalid": !!message,
      "aria-describedby": message ? errorId(field) : undefined,
      className: `${baseClass} ${message ? "border-red-500" : "border-gray-300"}`,
    };
  }

  return { errors, setErrors, clear, errorId, inputProps };
}
