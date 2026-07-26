"use client";

import { useState } from "react";
import { Package } from "../../staff/(dashboard)/neworder/types";

export interface PackageFormData {
  name: string;
  price: number;
  liquidDetergent: number;
  downy: number;
  color: string;
}

interface AdminPackageFormModalProps {
  initialPackage?: Package; // undefined = Add mode
  onSave: (data: PackageFormData) => void;
  onCancel: () => void;
}

const colorOptions = [
  { value: "bg-green-600", label: "Green" },
  { value: "bg-blue-600", label: "Blue" },
  { value: "bg-purple-600", label: "Purple" },
  { value: "bg-orange-500", label: "Orange" },
];

export default function AdminPackageFormModal({
  initialPackage,
  onSave,
  onCancel,
}: AdminPackageFormModalProps) {
  const isEdit = !!initialPackage;

  const [name, setName] = useState(initialPackage?.name ?? "");
  const [price, setPrice] = useState(initialPackage?.price ?? 0);
  const [liquidDetergent, setLiquidDetergent] = useState(initialPackage?.liquidDetergent ?? 0);
  const [downy, setDowny] = useState(initialPackage?.downy ?? 0);
  const [color, setColor] = useState(initialPackage?.color ?? colorOptions[0].value);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name) {
      setError("Package name is required.");
      return;
    }

    onSave({ name, price, liquidDetergent, downy, color });
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

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Package Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="package-name"
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

          <div>
            <label className="block text-sm text-gray-500 mb-1">Liquid Detergent (qty)</label>
            <input
              type="number"
              min={0}
              value={liquidDetergent}
              onChange={(e) => setLiquidDetergent(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Downy (qty)</label>
            <input
              type="number"
              min={0}
              value={downy}
              onChange={(e) => setDowny(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Color</label>
            <select
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
