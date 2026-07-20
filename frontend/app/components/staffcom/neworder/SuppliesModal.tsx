"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SupplyItem } from "../../../staff/(dashboard)/neworder/types";

interface SuppliesModalProps {
  supplies: SupplyItem[];
  onAdd: (supply: SupplyItem, quantity: number) => void;
  onClose: () => void;
}

export default function SuppliesModal({ supplies, onAdd, onClose }: SuppliesModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function handleQuantityChange(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  function handleAdd(supply: SupplyItem) {
    const qty = quantities[supply.id] || 1;
    onAdd(supply, qty);
    setQuantities((prev) => ({ ...prev, [supply.id]: 1 }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-red-500 hover:text-red-700"
        >
          <X size={24} />
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-center mb-6 pr-8">Laundry Supplies</h2>

        <div className="space-y-3">
          {supplies.map((supply) => (
            <div
              key={supply.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{supply.name}</p>
                <p className="text-xs text-gray-500">
                  ₱{supply.price.toFixed(2)} / {supply.unit}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  value={quantities[supply.id] ?? 1}
                  onChange={(e) =>
                    handleQuantityChange(supply.id, parseInt(e.target.value) || 1)
                  }
                  className="w-16 border border-gray-300 rounded-lg p-1 text-center"
                />
                <button
                  onClick={() => handleAdd(supply)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}