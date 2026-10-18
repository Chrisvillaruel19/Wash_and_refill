"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Package } from "../../staff/(dashboard)/neworder/types";
import { InventoryItem } from "../../staff/(dashboard)/types";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { useFieldErrors } from "../../lib/useFieldErrors";
import FieldError from "../FieldError";
import ColorPicker from "./ColorPicker";

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

// Default for a brand-new package — a real hex value, matching ColorPicker's
// own first preset. Existing packages keep whatever color (legacy Tailwind
// class or hex) they already have on file; see lib/packageColor.ts.
const DEFAULT_COLOR = "#16a34a";

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
  const [price, setPrice] = useState(initialPackage ? String(initialPackage.price) : "");
  const [color, setColor] = useState(initialPackage?.color ?? DEFAULT_COLOR);
  const [rows, setRows] = useState<SupplyRow[]>(
    () =>
      initialPackage?.details.map((d) => ({
        rowId: nextRowId++,
        inventoryId: d.inventoryId,
        quantity: d.quantity,
      })) ?? []
  );
  const fields = useFieldErrors<"name" | "price">("package");
  const base = "w-full border rounded-lg p-2 text-gray-900";
  // One message per supply row, shown under that row.
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  function clearRowError(rowId: number) {
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }

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
    setRows((prev) => [...prev, { rowId: nextRowId++, inventoryId: "", quantity: 0 }]);
  }

  function removeRow(rowId: number) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    clearRowError(rowId);
  }

  function updateRowInventory(rowId: number, inventoryId: string) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, inventoryId } : r)));
    clearRowError(rowId);
  }

  function updateRowQuantity(rowId: number, quantity: number) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, quantity } : r)));
    clearRowError(rowId);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const parsedPrice = Number(price);

    const fieldsValid = fields.setErrors({
      name: !name
        ? "Package name is required."
        : !trimmedName
          ? "Invalid package name."
          : trimmedName.length > 100
          ? "Package name must be at most 100 characters."
          : "",
      price: !price.trim() || parsedPrice <= 0 ? "Price must be greater than zero." : "",
    });

    const nextRowErrors: Record<number, string> = {};
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.inventoryId) {
        nextRowErrors[row.rowId] = "Select a supply for this row.";
      } else if (staleIngredientsById.has(row.inventoryId)) {
        nextRowErrors[row.rowId] =
          `${staleIngredientsById.get(row.inventoryId)?.itemName} is no longer active — remove or replace this supply.`;
      } else if (seen.has(row.inventoryId)) {
        nextRowErrors[row.rowId] = "This supply is already in the package — each supply can only appear once.";
      } else if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
        nextRowErrors[row.rowId] = "Quantity must be a whole number greater than zero.";
      }
      if (row.inventoryId) seen.add(row.inventoryId);
    }
    setRowErrors(nextRowErrors);

    if (!fieldsValid || Object.keys(nextRowErrors).length > 0) return;

    onSave({
      name: trimmedName,
      price: parsedPrice,
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

        {submitError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="package-name" className="block text-sm text-gray-500 mb-1">Package Name</label>
            <input
              id="package-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                fields.clear("name");
              }}
              name="package-name"
              autoComplete="off"
              maxLength={100}
              {...fields.inputProps("name", base)}
            />
            <FieldError id={fields.errorId("name")} message={fields.errors.name} />
          </div>

          <div>
            <label htmlFor="package-price" className="block text-sm text-gray-500 mb-1">Price</label>
            <input
              id="package-price"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0.00"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                fields.clear("price");
              }}
              {...fields.inputProps("price", base)}
            />
            <FieldError id={fields.errorId("price")} message={fields.errors.price} />
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
                const rowError = rowErrors[row.rowId];
                const rowBorder = rowError ? "border-red-500" : "border-gray-300";
                const rowErrorId = `package-row-${row.rowId}-error`;
                return (
                <div key={row.rowId}>
                <div className="flex items-center gap-2">
                  <select
                    value={row.inventoryId}
                    onChange={(e) => updateRowInventory(row.rowId, e.target.value)}
                    aria-label="Supply"
                    aria-invalid={!!rowError}
                    aria-describedby={rowError ? rowErrorId : undefined}
                    className={`flex-1 min-w-0 border rounded-lg p-2 text-gray-900 text-sm ${rowBorder}`}
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
                    placeholder="0"
                    value={row.quantity || ""}
                    onChange={(e) => updateRowQuantity(row.rowId, parseInt(e.target.value) || 0)}
                    aria-label="Quantity"
                    aria-invalid={!!rowError}
                    aria-describedby={rowError ? rowErrorId : undefined}
                    className={`w-20 shrink-0 border rounded-lg p-2 text-gray-900 text-sm ${rowBorder}`}
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
                <FieldError id={rowErrorId} message={rowError} />
                </div>
                );
              })}
            </div>
          </div>

          <ColorPicker label="Color" value={color} onChange={setColor} />

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
