"use client";

import { useState } from "react";
import { InventoryItem } from "../../staff/(dashboard)/types";
import { isCriticalInventoryItem } from "../../lib/inventoryRules";
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
  onSave: (data: InventoryFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function AdminInventoryFormModal({
  initialItem,
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminInventoryFormModalProps) {
  useEscapeKey(onCancel);
  const isEdit = !!initialItem;

  const [name, setName] = useState(initialItem?.name ?? "");
  const [currentStock, setCurrentStock] = useState(initialItem?.currentStock ?? 0);
  const [lowStockAlert, setLowStockAlert] = useState(initialItem?.lowStockAlert ?? 0);
  const [unit, setUnit] = useState(initialItem?.unit ?? "");
  const [price, setPrice] = useState(initialItem?.price ?? 0);
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
    if (currentStock < 0 || !Number.isInteger(currentStock)) {
      setError("Current stock must be a whole number, zero or greater.");
      return;
    }
    if (lowStockAlert < 0 || !Number.isInteger(lowStockAlert)) {
      setError("Low stock alert must be a whole number, zero or greater.");
      return;
    }
    if (price <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    onSave({ name: trimmedName, currentStock, lowStockAlert, unit: trimmedUnit, price });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-900">
          {isEdit ? "Edit Item" : "Add Item"}
        </h2>

        {isEdit && initialItem && isCriticalInventoryItem(initialItem) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
            This item&apos;s name is used to match stock deductions to specific packages or
            supplies sold at checkout. Renaming or deleting it will silently stop those
            deductions from working correctly.
          </p>
        )}

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

          <div>
            <label htmlFor="inventory-current-stock" className="block text-sm text-gray-500 mb-1">Current Stock</label>
            <input
              id="inventory-current-stock"
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="inventory-low-stock-alert" className="block text-sm text-gray-500 mb-1">Low Stock Alert</label>
            <input
              id="inventory-low-stock-alert"
              type="number"
              min={0}
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(parseInt(e.target.value) || 0)}
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
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
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
