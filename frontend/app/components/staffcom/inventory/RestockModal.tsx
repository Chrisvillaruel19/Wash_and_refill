"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { InventoryItem } from "../../../staff/(dashboard)/types";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface RestockModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string;
}

export default function RestockModal({ item, onConfirm, onCancel, submitting, error }: RestockModalProps) {
  useEscapeKey(onCancel);
  const [quantity, setQuantity] = useState(1);
  const [localError, setLocalError] = useState("");

  function handleConfirm() {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      setLocalError("Quantity must be a whole number greater than zero.");
      return;
    }
    setLocalError("");
    onConfirm(quantity);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-sm relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>

        <h2 className="text-lg font-bold mb-1 text-gray-900">Restock Item</h2>
        <p className="text-gray-500 text-sm mb-5">{item.name}</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity to add ({item.unit})
        </label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-full border border-gray-300 rounded-lg p-2 mb-6 text-gray-900"
        />

        {(localError || error) && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {localError || error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50 text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Restocking..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}