"use client";

import { useState } from "react";
import { X, KeyRound } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import FieldError from "../FieldError";

interface SetRestockPinModalProps {
  loading: boolean;
  error: string;
  success: string;
  onSave: (pin: string, confirmPin: string) => Promise<void> | void;
  onClose: () => void;
}

// Admin-only: sets the single shared PIN Staff enter on the Inventory page
// to authorize a restock. Never the Admin's login password — a separate,
// short, purpose-built PIN stored as a hash (see set-restock-pin.service.ts
// on the backend), never displayed back once saved.
export default function SetRestockPinModal({
  loading,
  error,
  success,
  onSave,
  onClose,
}: SetRestockPinModalProps) {
  useEscapeKey(onClose);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [confirmPinError, setConfirmPinError] = useState("");

  // Clear both fields once a save succeeds so the PIN doesn't linger on
  // screen. The parent resets `success` to "" before every save, so each
  // successful save is a fresh ""→message transition.
  const [prevSuccess, setPrevSuccess] = useState(success);
  if (success !== prevSuccess) {
    setPrevSuccess(success);
    if (success) {
      setPin("");
      setConfirmPin("");
    }
  }

  function handleSave() {
    const nextPinError = !pin ? "PIN is required." : !/^\d{4,6}$/.test(pin) ? "PIN must be 4-6 digits." : "";
    const nextConfirmPinError = !confirmPin
      ? "Please confirm the PIN."
      : pin !== confirmPin
        ? "PINs do not match."
        : "";
    setPinError(nextPinError);
    setConfirmPinError(nextConfirmPinError);
    if (nextPinError || nextConfirmPinError) return;
    onSave(pin, confirmPin);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full relative" style={{ maxWidth: "380px" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-gray-700 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Restock Authorization PIN</h2>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">
          Set the PIN Staff will enter on the Supplies page to authorize a restock. This is not
          your login password — share it only with people you trust to approve restocks.
        </p>

        <label htmlFor="new-restock-pin" className="sr-only">New PIN</label>
        <input
          id="new-restock-pin"
          type="password"
          inputMode="numeric"
          placeholder="New 4-6 digit PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setPinError("");
          }}
          autoComplete="new-password"
          maxLength={6}
          aria-invalid={!!pinError}
          aria-describedby={pinError ? "new-restock-pin-error" : undefined}
          className={`w-full border rounded-lg p-2 text-center text-lg tracking-[0.3em] text-gray-900 ${pinError ? "border-red-500" : "border-gray-300"}`}
        />
        <div className="mb-2">
          <FieldError id="new-restock-pin-error" message={pinError} />
        </div>

        <label htmlFor="confirm-restock-pin" className="sr-only">Confirm PIN</label>
        <input
          id="confirm-restock-pin"
          type="password"
          inputMode="numeric"
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={(e) => {
            setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setConfirmPinError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoComplete="new-password"
          maxLength={6}
          aria-invalid={!!confirmPinError}
          aria-describedby={confirmPinError ? "confirm-restock-pin-error" : undefined}
          className={`w-full border rounded-lg p-2 text-center text-lg tracking-[0.3em] text-gray-900 ${confirmPinError ? "border-red-500" : "border-gray-300"}`}
        />
        <div className="mb-2">
          <FieldError id="confirm-restock-pin-error" message={confirmPinError} />
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-700 text-sm mb-3 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
            {success}
          </p>
        )}

        <div className="flex gap-3 mt-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 border border-blue-500 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save PIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
