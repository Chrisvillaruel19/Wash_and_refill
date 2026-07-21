"use client";

interface ConfirmClaimModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmClaimModal({ onConfirm, onCancel }: ConfirmClaimModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Mark as Claimed</h2>
        <p className="text-gray-600 mb-6">
          Are you sure this order has been claimed by the customer?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-red-400 text-red-500 font-medium hover:bg-red-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg border border-green-500 text-green-600 font-medium hover:bg-green-50"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}