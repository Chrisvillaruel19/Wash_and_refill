"use client";

import { useState } from "react";
import { useEscapeKey } from "../../lib/useEscapeKey";

export interface WithdrawalFormData {
  amount: number;
  reason: string;
}

interface AdminWithdrawalFormModalProps {
  onSave: (data: WithdrawalFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function AdminWithdrawalFormModal({
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminWithdrawalFormModalProps) {
  useEscapeKey(onCancel);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("A reason is required.");
      return;
    }
    if (trimmedReason.length > 500) {
      setError("Reason must be at most 500 characters.");
      return;
    }

    onSave({ amount, reason: trimmedReason });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Cash Withdrawal</h2>

        {(error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="withdrawal-amount" className="block text-sm text-gray-500 mb-1">Amount</label>
            <input
              id="withdrawal-amount"
              type="number"
              min={0}
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="withdrawal-reason" className="block text-sm text-gray-500 mb-1">Reason</label>
            <textarea
              id="withdrawal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
