"use client";

import { useState } from "react";
import { InventoryItem } from "../../staff/(dashboard)/types";

export interface InventoryFormData {
  name: string;
  currentStock: number;
  lowStockAlert: number;
  unit: string;
  price: number;
}

interface AdminInventoryFormModalProps {
  initialItem?: InventoryItem; // undefined = Add mode
  onSave: (data: InventoryFormData) => void;
  onCancel: () => void;
}

export default function AdminInventoryFormModal({
  initialItem,
  onSave,
  onCancel,
}: AdminInventoryFormModalProps) {
  const isEdit = !!initialItem;

  const [name, setName] = useState(initialItem?.name ?? "");
  const [currentStock, setCurrentStock] = useState(initialItem?.currentStock ?? 0);
  const [lowStockAlert, setLowStockAlert] = useState(initialItem?.lowStockAlert ?? 0);
  const [unit, setUnit] = useState(initialItem?.unit ?? "");
  const [price, setPrice] = useState(initialItem?.price ?? 0);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !unit) {
      setError("Item name and unit are required.");
      return;
    }

    onSave({ name, currentStock, lowStockAlert, unit, price });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-gray-900">
          {isEdit ? "Edit Item" : "Add Item"}
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="inventory-item-name"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Current Stock</label>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Low Stock Alert</label>
            <input
              type="number"
              min={0}
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              name="inventory-item-unit"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Price</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
