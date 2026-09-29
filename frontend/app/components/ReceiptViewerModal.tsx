"use client";

import { X } from "lucide-react";
import { ExpenseRecord } from "../staff/(dashboard)/types";
import { useEscapeKey } from "../lib/useEscapeKey";

interface ReceiptViewerModalProps {
  expense: ExpenseRecord & { imageDataUrl: string };
  onClose: () => void;
}

// Full-size view of an expense's receipt photo, with the expense details
// underneath so the viewer can check the photo against what was entered.
// Shared by the Admin and Staff expense pages.
export default function ReceiptViewerModal({ expense, onClose }: ReceiptViewerModalProps) {
  useEscapeKey(onClose);
  const when = new Date(expense.timestamp);
  // "data:image/jpeg;base64,..." → "jpeg"
  const ext = expense.imageDataUrl.match(/^data:image\/([a-zA-Z0-9]+)/)?.[1] ?? "png";

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-bold text-gray-900">Expense Receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-gray-100 flex items-center justify-center p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expense.imageDataUrl}
            alt={`Receipt for ${expense.description || "expense"}`}
            className="max-w-full max-h-[60vh] object-contain rounded"
          />
        </div>

        <dl className="px-5 py-3 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t">
          <dt className="text-gray-500">Amount</dt>
          <dd className="text-gray-900 font-semibold">₱{expense.amount.toFixed(2)}</dd>
          <dt className="text-gray-500">Category</dt>
          <dd className="text-gray-900">{expense.category}</dd>
          <dt className="text-gray-500">Submitted</dt>
          <dd className="text-gray-900">
            {expense.submittedBy} · {when.toLocaleDateString()}{" "}
            {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </dd>
          <dt className="text-gray-500">Description</dt>
          <dd className="text-gray-900 break-words">{expense.description || "—"}</dd>
        </dl>

        <div className="flex gap-3 px-5 pb-4">
          {/* Saves the receipt photo to the device. */}
          <a
            href={expense.imageDataUrl}
            download={`receipt-${when.toISOString().slice(0, 10)}.${ext}`}
            className="flex-1 text-center border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
