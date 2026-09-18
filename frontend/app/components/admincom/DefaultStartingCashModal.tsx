"use client";

import { useState } from "react";
import { X, Wallet } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";

interface DefaultStartingCashModalProps {
  currentValue: number;
  loading: boolean;
  error: string;
  success: string;
  onSave: (value: number) => void;
  onClose: () => void;
}

// Admin-only: the starting float used ONLY when no previous Shift Handover
// exists yet (see backend's getDrawerStart) — every subsequent shift's
// beginning cash is always the prior shift's own actual cash count instead.
// Changing this value here never rewrites any already-submitted handover.
export default function DefaultStartingCashModal({
  currentValue,
  loading,
  error,
  success,
  onSave,
  onClose,
}: DefaultStartingCashModalProps) {
  useEscapeKey(onClose);
  const [value, setValue] = useState(String(currentValue));
  const [localError, setLocalError] = useState("");

  function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || value.trim() === "") {
      setLocalError("Enter a valid amount.");
      return;
    }
    if (parsed <= 0) {
      setLocalError("Amount must be greater than zero.");
      return;
    }
    if (parsed > 1_000_000) {
      setLocalError("Amount is unreasonably large.");
      return;
    }
    setLocalError("");
    onSave(parsed);
  }

  const displayedError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full relative" style={{ maxWidth: "380px" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Wallet size={18} className="text-gray-700 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Default Starting Cash</h2>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">
          This fixed amount is placed in the cash drawer at the beginning of each shift. Each new
          shift starts with this amount regardless of the previous shift&apos;s actual cash count.
        </p>

        <label htmlFor="default-starting-cash" className="sr-only">Default starting cash</label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
          <input
            id="default-starting-cash"
            type="number"
            min={0}
            step="0.01"
            placeholder="5000"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setLocalError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-lg p-2 pl-7 text-gray-900"
          />
        </div>

        {displayedError && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {displayedError}
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
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
