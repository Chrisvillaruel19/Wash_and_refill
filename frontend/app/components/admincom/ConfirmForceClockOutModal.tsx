"use client";

import { useEscapeKey } from "../../lib/useEscapeKey";

interface ConfirmForceClockOutModalProps {
  staffName: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string;
}

export default function ConfirmForceClockOutModal({
  staffName,
  onConfirm,
  onCancel,
  submitting,
  error,
}: ConfirmForceClockOutModalProps) {
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Force Clock Out</h2>
        <p className="text-gray-600 mb-6">
          This will close {staffName}&apos;s open shift now, without their Shift Handover, so the next
          staff member can clock in. The record will be marked Auto-closed. Any sales they didn&apos;t
          hand over will go into the next handover. Are you sure?
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
            {submitting ? "Clocking out..." : "Force Clock Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
