"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Package } from "../../staff/(dashboard)/neworder/types";
import { InventoryItem } from "../../staff/(dashboard)/types";
import { useEscapeKey } from "../../lib/useEscapeKey";

export interface PackageFormData {
  name: string;
  price: number;
  color: string;
  details: { inventoryId: string; quantity: number }[];
}

interface AdminPackageFormModalProps {
  initialPackage?: Package; // undefined = Add mode
  // Real Inventory catalog to populate the supply dropdown from — never
  // hardcoded, matching what create-order.service.ts actually validates
  // against (any active inventory row, any quantity).
  inventoryOptions: InventoryItem[];
  onSave: (data: PackageFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

const colorOptions = [
  { value: "bg-green-600", label: "Green" },
  { value: "bg-blue-600", label: "Blue" },
  { value: "bg-purple-600", label: "Purple" },
  { value: "bg-orange-500", label: "Orange" },
];

let nextRowId = 0;

interface SupplyRow {
  // Local-only key for React list identity — never sent to the backend.
  rowId: number;
  inventoryId: string;
  quantity: number;
}

// Two inventory rows can share a display name (e.g. "Liquid Detergent" in
// Sachet vs Liters) — same disambiguation used at checkout time (New
// Order's Supplies modal) and in Admin Catalog's own Supplies tab.
function buildOptionLabel(item: InventoryItem, nameCounts: Map<string, number>): string {
  return (nameCounts.get(item.name) || 0) > 1 ? `${item.name} (${item.unit})` : item.name;
}

export default function AdminPackageFormModal({
  initialPackage,
  inventoryOptions,
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminPackageFormModalProps) {
  useEscapeKey(onCancel);
  const isEdit = !!initialPackage;

  const [name, setName] = useState(initialPackage?.name ?? "");
  const [price, setPrice] = useState(initialPackage?.price ?? 0);
  const [color, setColor] = useState(initialPackage?.color ?? colorOptions[0].value);
  const [rows, setRows] = useState<SupplyRow[]>(
    () =>
      initialPackage?.details.map((d) => ({
        rowId: nextRowId++,
        inventoryId: d.inventoryId,
        quantity: d.quantity,
      })) ?? []
  );
  const [error, setError] = useState("");

  const nameCounts = new Map<string, number>();
  inventoryOptions.forEach((i) => nameCounts.set(i.name, (nameCounts.get(i.name) || 0) + 1));

  // A package's existing recipe can reference an ingredient that's since
  // been deactivated (findAllActive/GET /inventory only returns active
  // items, but Package.details keeps the historical reference regardless —
  // same "don't lose history" reasoning as everywhere else in this
  // codebase). Without this, that row's <select> would have no matching
  // <option>, the browser would silently fall back to showing some other
  // item, and saving the form untouched would swap in the wrong ingredient
  // instead of preserving what was actually there.
  const staleIngredientsById = new Map(
    (initialPackage?.details ?? [])
      .filter((d) => !inventoryOptions.some((i) => i.id === d.inventoryId))
      .map((d) => [d.inventoryId, d])
  );

  function addRow() {
    const firstAvailable = inventoryOptions.find((i) => !rows.some((r) => r.inventoryId === i.id));
    setRows((prev) => [
      ...prev,
      { rowId: nextRowId++, inventoryId: firstAvailable?.id ?? "", quantity: 1 },
    ]);
  }

  function removeRow(rowId: number) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateRowInventory(rowId: number, inventoryId: string) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, inventoryId } : r)));
  }

  function updateRowQuantity(rowId: number, quantity: number) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, quantity } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Package name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Package name must be at most 100 characters.");
      return;
    }
    if (price <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    for (const row of rows) {
      if (!row.inventoryId) {
        setError("Every supply row must have an item selected.");
        return;
      }
      if (staleIngredientsById.has(row.inventoryId)) {
        setError(
          `${staleIngredientsById.get(row.inventoryId)?.itemName} is no longer active — remove or replace this supply before saving.`
        );
        return;
      }
      if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
        setError("Every supply quantity must be a whole number greater than zero.");
        return;
      }
    }

    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.inventoryId)) {
        setError("The same supply is selected more than once — each supply can only appear once per package.");
        return;
      }
      seen.add(row.inventoryId);
    }

    onSave({
      name: trimmedName,
      price,
      color,
      details: rows.map((r) => ({ inventoryId: r.inventoryId, quantity: r.quantity })),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-900">
          {isEdit ? "Edit Package" : "Add Package"}
        </h2>

        {isEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
            Renaming or deleting may affect how historical orders appear in Shift Handover reports.
          </p>
        )}

        {(error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="package-name" className="block text-sm text-gray-500 mb-1">Package Name</label>
            <input
              id="package-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="package-name"
              autoComplete="off"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="package-price" className="block text-sm text-gray-500 mb-1">Price</label>
            <input
              id="package-price"
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="block text-sm text-gray-500">Included Supplies</span>
              <button
                type="button"
                onClick={addRow}
                disabled={inventoryOptions.length === 0}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add Supply
              </button>
            </div>

            {rows.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No supplies added yet.</p>
            )}

            <div className="space-y-2">
              {rows.map((row) => {
                const stale = staleIngredientsById.get(row.inventoryId);
                return (
                <div key={row.rowId} className="flex items-center gap-2">
                  <select
                    value={row.inventoryId}
                    onChange={(e) => updateRowInventory(row.rowId, e.target.value)}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg p-2 text-gray-900 text-sm"
                  >
                    <option value="" disabled>
                      Select a supply
                    </option>
                    {stale && (
                      <option value={stale.inventoryId}>
                        {stale.itemName} (deactivated — remove or replace)
                      </option>
                    )}
                    {inventoryOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {buildOptionLabel(item, nameCounts)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateRowQuantity(row.rowId, parseInt(e.target.value) || 0)}
                    className="w-20 shrink-0 border border-gray-300 rounded-lg p-2 text-gray-900 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.rowId)}
                    className="shrink-0 text-gray-400 hover:text-red-500"
                    title="Remove supply"
                  >
                    <X size={16} />
                  </button>
                </div>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="package-color" className="block text-sm text-gray-500 mb-1">Color</label>
            <select
              id="package-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            >
              {colorOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
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
