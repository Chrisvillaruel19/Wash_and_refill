"use client";

import { useState } from "react";
import { ServiceItem, ServiceCategory } from "../../staff/(dashboard)/neworder/types";
import { useEscapeKey } from "../../lib/useEscapeKey";

export interface ServiceFormData {
  categoryId: string;
  name: string;
  pricePerKg: number;
}

interface AdminServiceFormModalProps {
  categories: ServiceCategory[];
  initialService?: ServiceItem; // undefined = Add mode
  onSave: (data: ServiceFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function AdminServiceFormModal({
  categories,
  initialService,
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminServiceFormModalProps) {
  useEscapeKey(onCancel);
  const isEdit = !!initialService;

  const [categoryId, setCategoryId] = useState(initialService?.categoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(initialService?.name ?? "");
  const [pricePerKg, setPricePerKg] = useState(initialService?.pricePerKg ?? 0);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || !categoryId) {
      setError("Type and name are required.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Service name must be at most 100 characters.");
      return;
    }
    if (pricePerKg <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    onSave({ categoryId, name: trimmedName, pricePerKg });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-900">
          {isEdit ? "Edit Service" : "Add Service"}
        </h2>

        {isEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
            Renaming or deleting may cause this service to no longer group correctly with
            historical orders in reports.
          </p>
        )}

        {(error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Type</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="service-name"
              autoComplete="off"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Price per Kg</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={pricePerKg}
              onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
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
