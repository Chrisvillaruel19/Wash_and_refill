"use client";

import { useState } from "react";
import { InventoryItem } from "../../staff/(dashboard)/types";
import { useEscapeKey } from "../../lib/useEscapeKey";

export interface InventoryFormData {
  name: string;
  currentStock: number;
  lowStockAlert: number;
  unit: string;
  price: number;
}

interface AdminInventoryFormModalProps {
  initialItem?: InventoryItem; // undefined = Add mode
  allowStockEdit?: boolean;
  onSave: (data: InventoryFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function AdminInventoryFormModal({
  initialItem,
  allowStockEdit = true,
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminInventoryFormModalProps) {
  useEscapeKey(onCancel);
  const isEdit = !!initialItem;
  const canEditStock = !isEdit || allowStockEdit;

  const [name, setName] = useState(initialItem?.name ?? "");
  const [currentStock, setCurrentStock] = useState(
    initialItem ? String(initialItem.currentStock) : ""
  );
  const [lowStockAlert, setLowStockAlert] = useState(
    initialItem ? String(initialItem.lowStockAlert) : ""
  );
  const [unit, setUnit] = useState(initialItem?.unit ?? "");
  const [price, setPrice] = useState(initialItem ? String(initialItem.price) : "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();

    if (!trimmedName || !trimmedUnit) {
      setError("Item name and unit are required.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Item name must be at most 100 characters.");
      return;
    }
    if (trimmedUnit.length > 20) {
      setError("Unit must be at most 20 characters.");
      return;
    }
    const parsedCurrentStock = Number(currentStock);
    const parsedLowStockAlert = Number(lowStockAlert);
    const parsedPrice = Number(price);

    if (!currentStock.trim() || parsedCurrentStock < 0 || !Number.isInteger(parsedCurrentStock)) {
      setError("Current stock must be a whole number, zero or greater.");
      return;
    }
    if (!lowStockAlert.trim() || parsedLowStockAlert < 0 || !Number.isInteger(parsedLowStockAlert)) {
      setError("Low stock alert must be a whole number, zero or greater.");
      return;
    }
    if (!price.trim() || parsedPrice <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    onSave({
      name: trimmedName,
      currentStock: parsedCurrentStock,
      lowStockAlert: parsedLowStockAlert,
      unit: trimmedUnit,
      price: parsedPrice,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-900">
          {isEdit ? "Edit Item" : "Add Item"}
        </h2>

        {(error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inventory-item-name" className="block text-sm text-gray-500 mb-1">Item Name</label>
            <input
              id="inventory-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="inventory-item-name"
              autoComplete="off"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          {canEditStock && (
            <div>
              <label htmlFor="inventory-current-stock" className="block text-sm text-gray-500 mb-1">Current Stock</label>
              <input
                id="inventory-current-stock"
                type="number"
                min={0}
                placeholder="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
              />
            </div>
          )}

          <div>
            <label htmlFor="inventory-low-stock-alert" className="block text-sm text-gray-500 mb-1">Low Stock Alert</label>
            <input
              id="inventory-low-stock-alert"
              type="number"
              min={0}
              placeholder="0"
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="inventory-item-unit" className="block text-sm text-gray-500 mb-1">Unit</label>
            <input
              id="inventory-item-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              name="inventory-item-unit"
              autoComplete="off"
              maxLength={20}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="inventory-price" className="block text-sm text-gray-500 mb-1">Price</label>
            <input
              id="inventory-price"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
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
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
