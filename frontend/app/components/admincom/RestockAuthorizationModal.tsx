"use client";

import { X, KeyRound } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";

interface RestockAuthorizationModalProps {
  itemName: string;
  code: string | null;
  expiresIn: string | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  onClose: () => void;
}

// Admin-only: generates a one-time, 6-digit, short-lived code for a Staff
// member to redeem when restocking this item. The code is displayed here,
// on the Admin's own screen, to be read aloud/handed over in person — it
// is never the Admin's account password, and this modal never asks for or
// transmits one.
export default function RestockAuthorizationModal({
  itemName,
  code,
  expiresIn,
  loading,
  error,
  onGenerate,
  onClose,
}: RestockAuthorizationModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full relative" style={{ maxWidth: "380px" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-gray-700 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Authorize Restock</h2>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">{itemName}</p>

        {code ? (
          <>
            <p className="text-xs text-gray-500 mb-2">
              Give this code to the Staff member. It expires in {expiresIn} and can only be used once.
            </p>
            <p className="text-center text-3xl font-bold tracking-[0.3em] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg py-4 mb-4">
              {code}
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-sm mb-4">
            Generate a one-time code so a Staff member can complete this restock.
          </p>
        )}

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
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
            onClick={onGenerate}
            disabled={loading}
            className="flex-1 border border-blue-500 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? "Generating..." : code ? "Generate New Code" : "Generate Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
