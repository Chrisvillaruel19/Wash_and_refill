"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { InventoryItem } from "../../../staff/(dashboard)/types";

interface EditItemModalProps {
  item: InventoryItem;
  onSave: (updates: Partial<InventoryItem>) => void;
  onCancel: () => void;
}

export default function EditItemModal({ item, onSave, onCancel }: EditItemModalProps) {
  const [currentStock, setCurrentStock] = useState(item.currentStock);
  const [lowStockAlert, setLowStockAlert] = useState(item.lowStockAlert);
  const [price, setPrice] = useState(item.price);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl p-5 sm:p-6 w-full relative"
        style={{ maxWidth: "380px" }}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-base sm:text-lg font-bold mb-1 text-gray-900">Edit Item</h2>
        <p className="text-gray-500 text-xs sm:text-sm mb-5">{item.name}</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
            <input
              type="number"
              min={0}
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ currentStock, lowStockAlert, price })}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}