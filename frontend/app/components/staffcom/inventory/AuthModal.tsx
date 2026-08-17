"use client";

import { useEffect, useRef, useState } from "react";
import { X, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { useEscapeKey } from "../../../lib/useEscapeKey";
import { verifyRestockPin } from "../../../lib/auth";

interface AuthModalProps {
  onAuthorized: (pin: string) => void;
  onCancel: () => void;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;
const VALIDATE_DEBOUNCE_MS = 400;

type Status = "empty" | "incomplete" | "pending" | "validating" | "valid" | "invalid" | "error";

// Collects the shared Restock Authorization PIN an Admin set from their own
// account settings — never an Admin username or password, and never stored
// anywhere but this component's own state (no localStorage, no logging).
//
// The PIN is checked against the backend as soon as it reaches a valid
// length (4-6 digits), debounced so a Staff member typing "1920" digit by
// digit fires exactly one request, not four — and any response for a PIN
// that's since changed is discarded rather than shown. Continue is only
// ever enabled after a fresh server-confirmed "valid" result; this is a UX
// pre-check only; restockInventoryService re-verifies independently
// regardless of what this component decided, so a manipulated frontend
// state can never itself authorize a restock.
export default function AuthModal({ onAuthorized, onCancel }: AuthModalProps) {
  useEscapeKey(onCancel);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status>("empty");

  // Tracks which pin value the most recent validation request/response
  // belongs to, so a response for an already-superseded pin (the Staff
  // kept typing while the request was in flight) is discarded instead of
  // overwriting the status for the pin currently on screen.
  const requestedPinRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handlePinChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, MAX_PIN_LENGTH);
    setPin(digits);

    // Clearing any previous valid/invalid/error result immediately (before
    // the debounced re-validation below) is what makes "the old error
    // disappears as soon as you start changing the PIN" true, rather than
    // lingering until the next request resolves.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestedPinRef.current = null;

    if (digits.length === 0) {
      setStatus("empty");
      return;
    }
    if (digits.length < MIN_PIN_LENGTH) {
      setStatus("incomplete");
      return;
    }

    setStatus("pending");
    debounceRef.current = setTimeout(() => {
      void runValidation(digits);
    }, VALIDATE_DEBOUNCE_MS);
  }

  async function runValidation(candidate: string) {
    // Duplicate-request guard: if a validation for this exact value is
    // already in flight (or already resolved), don't fire another.
    if (requestedPinRef.current === candidate) return;
    requestedPinRef.current = candidate;
    setStatus("validating");

    try {
      const valid = await verifyRestockPin(candidate);
      if (requestedPinRef.current !== candidate) return; // pin changed since this request started
      setStatus(valid ? "valid" : "invalid");
    } catch {
      if (requestedPinRef.current !== candidate) return;
      setStatus("error");
    }
  }

  function handleConfirm() {
    if (status !== "valid") return;
    onAuthorized(pin);
  }

  const message: Record<Status, string> = {
    empty: "Enter your Restock Authorization PIN.",
    incomplete: "PIN must contain 4–6 digits.",
    pending: "",
    validating: "Checking PIN...",
    valid: "PIN verified.",
    invalid: "Incorrect Restock Authorization PIN.",
    error: "Unable to verify PIN right now. Please try again.",
  };

  const isError = status === "invalid" || status === "error";
  const canContinue = status === "valid";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl p-5 sm:p-6 w-full relative"
        style={{ maxWidth: "380px" }}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-gray-700 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Authorization Required</h2>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">
          Enter the Restock Authorization PIN to continue.
        </p>

        <label htmlFor="restock-auth-pin" className="sr-only">Restock Authorization PIN</label>
        <div className="relative mb-2">
          <input
            id="restock-auth-pin"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter 4–6 digit PIN"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoComplete="off"
            maxLength={MAX_PIN_LENGTH}
            aria-invalid={isError}
            className={`w-full border rounded-lg p-2 text-center text-lg tracking-[0.3em] text-gray-900 ${
              isError
                ? "border-red-400"
                : status === "valid"
                ? "border-green-400"
                : "border-gray-300"
            }`}
          />
          {status === "validating" && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
            />
          )}
          {status === "valid" && (
            <CheckCircle2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
            />
          )}
        </div>

        {message[status] && (
          <p
            className={`text-sm mb-3 rounded-lg py-2 px-3 border ${
              isError
                ? "text-red-600 bg-red-50 border-red-200"
                : status === "valid"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-gray-500 bg-gray-50 border-gray-200"
            }`}
          >
            {message[status]}
          </p>
        )}

        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-red-300 text-red-500 rounded-lg py-2 text-sm font-medium hover:bg-red-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canContinue}
            className="flex-1 border border-green-500 text-green-600 rounded-lg py-2 text-sm font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
