"use client";

import { useEscapeKey } from "../../../lib/useEscapeKey";

interface ConfirmMarkPaidModalProps {
  customerName: string;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string;
}

export default function ConfirmMarkPaidModal({
  customerName,
  amount,
  onConfirm,
  onCancel,
  submitting,
  error,
}: ConfirmMarkPaidModalProps) {
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Confirm Payment</h2>
        <p className="text-gray-600 mb-4">Are you sure this order has been fully paid?</p>
        <dl className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 space-y-1">
          <div className="flex justify-between">
            <dt className="text-gray-500">Customer</dt>
            <dd className="text-gray-900 font-medium">{customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Amount</dt>
            <dd className="text-gray-900 font-medium">₱{amount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Current Payment Status</dt>
            <dd className="text-red-500 font-medium">UNPAID</dd>
          </div>
        </dl>
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
            className="px-5 py-2 rounded-lg border border-green-500 text-green-600 font-medium hover:bg-green-50 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
