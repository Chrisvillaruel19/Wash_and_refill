"use client";

import { useState } from "react";
import { X, KeyRound } from "lucide-react";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface AuthModalProps {
  onAuthorized: (pin: string) => void;
  onCancel: () => void;
}

// Collects only the shared Restock Authorization PIN an Admin set from
// their own account settings — never an Admin username or password. This
// component makes no API call itself: the PIN is validated when the
// actual restock is submitted (see the parent page's handleRestockConfirm),
// so a wrong PIN surfaces there, not here.
export default function AuthModal({ onAuthorized, onCancel }: AuthModalProps) {
  useEscapeKey(onCancel);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleConfirm() {
    const trimmed = pin.trim();
    if (!trimmed) {
      setError("Enter the Restock Authorization PIN.");
      return;
    }
    onAuthorized(trimmed);
  }

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
        <input
          id="restock-auth-pin"
          type="text"
          inputMode="numeric"
          placeholder="Restock Authorization PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          autoComplete="off"
          maxLength={6}
          className="w-full border border-gray-300 rounded-lg p-2 text-center text-lg tracking-[0.3em] mb-2 text-gray-900"
        />

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
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
            className="flex-1 border border-green-500 text-green-600 rounded-lg py-2 text-sm font-medium hover:bg-green-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
