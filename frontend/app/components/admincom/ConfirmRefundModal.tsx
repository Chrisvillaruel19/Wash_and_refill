"use client";

import { useEscapeKey } from "../../lib/useEscapeKey";

interface ConfirmRefundModalProps {
  amount: number;
  // Claimed orders are refunded only in special cases (e.g. damaged items).
  claimed?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string;
}

export default function ConfirmRefundModal({
  amount,
  claimed,
  onConfirm,
  onCancel,
  submitting,
  error,
}: ConfirmRefundModalProps) {
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Refund Order</h2>
        <p className="text-gray-600 mb-6">
          {claimed
            ? "This order was already claimed. Refund it only in special cases, such as damaged laundry items."
            : "This order was cancelled after being paid."}{" "}
          Confirm only once the ₱{amount.toFixed(2)} has been handed back to the customer — the payment
          will be marked as Refunded.
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 rounded-lg border border-red-400 text-red-500 font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {submitting ? "Refunding..." : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
