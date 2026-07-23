"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { InventoryItem } from "../../../staff/(dashboard)/types";

interface RestockModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export default function RestockModal({ item, onConfirm, onCancel }: RestockModalProps) {
  const [quantity, setQuantity] = useState(1);

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

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50 text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(quantity)}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}