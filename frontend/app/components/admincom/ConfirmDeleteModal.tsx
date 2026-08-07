"use client";

import { useEscapeKey } from "../../lib/useEscapeKey";

interface ConfirmDeleteModalProps {
  itemName: string;
  warning?: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function ConfirmDeleteModal({
  itemName,
  warning,
  onConfirm,
  onCancel,
  submitting,
  submitError,
}: ConfirmDeleteModalProps) {
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Delete Item</h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete {itemName}? This cannot be undone.
        </p>
        {warning && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
            {warning}
          </p>
        )}
        {submitError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {submitError}
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
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
