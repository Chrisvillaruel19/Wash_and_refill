"use client";

import { X, Shirt, Layers, LayoutGrid, Square } from "lucide-react";
import { ServiceCategory } from "../../../staff/(dashboard)/neworder/types";

const iconMap: Record<string, React.ElementType> = {
  Shirt,
  Layers,
  LayoutGrid,
  Square,
};

interface CategoryPickerModalProps {
  categories: ServiceCategory[];
  onSelect: (category: ServiceCategory) => void;
  onClose: () => void;
}

export default function CategoryPickerModal({
  categories,
  onSelect,
  onClose,
}: CategoryPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-md max-h-[85vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-red-500 hover:text-red-700"
        >
          <X size={24} />
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-center mb-6 pr-8 text-gray-900">
          Select Laundry Service
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Shirt;
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category)}
                className="flex items-center gap-3 border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <Icon size={22} className="text-gray-700 shrink-0" />
                <span className="font-medium text-gray-800">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}