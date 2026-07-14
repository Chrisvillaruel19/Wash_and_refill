"use client";

import { useState, useMemo } from "react";
import { ServiceCategory, ServiceItemOption, ServiceType } from "../../../staff/(dashboard)/neworder/types";

interface ServiceItemFormModalProps {
  category: ServiceCategory;
  itemOptions: ServiceItemOption[];
  onConfirm: (result: {
    itemName: string;
    quantityKg: number;
    serviceType: ServiceType;
    total: number;
  }) => void;
  onCancel: () => void;
}

const serviceTypes: ServiceType[] = ["Wash & Dry", "Wash Only", "Dry Only"];

export default function ServiceItemFormModal({
  category,
  itemOptions,
  onConfirm,
  onCancel,
}: ServiceItemFormModalProps) {
  const [selectedItemId, setSelectedItemId] = useState(itemOptions[0]?.id ?? "");
  const [quantityKg, setQuantityKg] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType>("Wash & Dry");

  const selectedItem = itemOptions.find((item) => item.id === selectedItemId);

  const total = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.pricePerKg * quantityKg;
  }, [selectedItem, quantityKg]);

  function handleConfirm() {
    if (!selectedItem) return;
    onConfirm({
      itemName: selectedItem.name,
      quantityKg,
      serviceType,
      total,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center uppercase mb-6">
          {category.name}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 sm:items-center mb-4">
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-full"
          >
            {itemOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <p className="text-base sm:text-lg font-medium">
            Price: {selectedItem?.pricePerKg.toFixed(2)} / KG
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 sm:items-center mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Input Qty(kg):
            </label>
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={quantityKg}
              onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
              className="border border-gray-300 rounded-lg p-2 w-full"
            />
          </div>

          <p className="text-base sm:text-lg font-medium">
            Total: ₱{total.toFixed(2)}
          </p>
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Service Type:
          </label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="border border-gray-300 rounded-lg p-2 w-full"
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}