"use client";

import { useState, useMemo } from "react";
import { Check, Search } from "lucide-react";
import { ServiceCategory, ServiceItemOption, ServiceType } from "../../../staff/(dashboard)/neworder/types";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface ServiceItemFormModalProps {
  category: ServiceCategory;
  itemOptions: ServiceItemOption[];
  onConfirm: (result: {
    itemId: string;
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
  useEscapeKey(onCancel);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [isItemListOpen, setIsItemListOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [quantityKg, setQuantityKg] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("Wash & Dry");

  const selectedItem = itemOptions.find((item) => item.id === selectedItemId);
  const filteredItemOptions = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return itemOptions;
    return itemOptions.filter((item) => item.name.toLowerCase().includes(query));
  }, [itemOptions, itemSearch]);

  const total = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.pricePerKg * (Number(quantityKg) || 0);
  }, [selectedItem, quantityKg]);

  function handleConfirm() {
    const parsedQuantityKg = Number(quantityKg);
    if (!selectedItem || !quantityKg.trim() || parsedQuantityKg <= 0) return;
    onConfirm({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantityKg: parsedQuantityKg,
      serviceType,
      total,
    });
  }

  function selectItem(item: ServiceItemOption) {
    setSelectedItemId(item.id);
    setItemSearch("");
    setIsItemListOpen(false);
  }

  function handleItemSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && isItemListOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsItemListOpen(false);
      return;
    }

    if (event.key === "ArrowDown" && filteredItemOptions.length > 0) {
      event.preventDefault();
      setIsItemListOpen(true);
      setActiveOptionIndex((current) =>
        Math.min(isItemListOpen ? current + 1 : 0, filteredItemOptions.length - 1)
      );
    } else if (event.key === "ArrowUp" && filteredItemOptions.length > 0) {
      event.preventDefault();
      setIsItemListOpen(true);
      setActiveOptionIndex((current) =>
        isItemListOpen ? Math.max(current - 1, 0) : filteredItemOptions.length - 1
      );
    } else if (event.key === "Enter" && isItemListOpen) {
      const activeOption = filteredItemOptions[activeOptionIndex];
      if (activeOption) {
        event.preventDefault();
        selectItem(activeOption);
      }
    }
  }

  if (itemOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-lg text-center">
          <h2 className="text-xl sm:text-2xl font-bold uppercase mb-4 text-gray-900">
            {category.name}
          </h2>
          <p className="text-gray-500 mb-6">
            No laundry services are configured in this category yet. Add one from Admin Catalog first.
          </p>
          <button
            onClick={onCancel}
            className="w-full border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50 text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center uppercase mb-6 text-gray-900">
          {category.name}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 sm:items-center mb-4">
          <div
            className="relative w-full"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsItemListOpen(false);
              }
            }}
          >
            <label htmlFor="service-item-search" className="sr-only">Search service items</label>
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="service-item-search"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isItemListOpen}
              aria-controls="service-item-options"
              aria-activedescendant={
                isItemListOpen && filteredItemOptions[activeOptionIndex]
                  ? `service-item-option-${activeOptionIndex}`
                  : undefined
              }
              autoComplete="off"
              placeholder="Search or select an item"
              value={isItemListOpen ? itemSearch : selectedItem?.name ?? itemSearch}
              onFocus={() => {
                if (selectedItem) setItemSearch("");
                setActiveOptionIndex(0);
                setIsItemListOpen(true);
              }}
              onChange={(event) => {
                setItemSearch(event.target.value);
                setSelectedItemId("");
                setActiveOptionIndex(0);
                setIsItemListOpen(true);
              }}
              onKeyDown={handleItemSearchKeyDown}
              className="border border-gray-300 rounded-lg py-2 pl-9 pr-3 w-full text-gray-900"
            />
            {isItemListOpen && (
              <ul
                id="service-item-options"
                role="listbox"
                className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {filteredItemOptions.length > 0 ? filteredItemOptions.map((item, index) => (
                  <li
                    id={`service-item-option-${index}`}
                    key={item.id}
                    role="option"
                    aria-selected={selectedItemId === item.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveOptionIndex(index)}
                    onClick={() => selectItem(item)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                      index === activeOptionIndex ? "bg-blue-50 text-blue-900" : "text-gray-800"
                    }`}
                  >
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 text-xs text-gray-500">
                      ₱{item.pricePerKg.toFixed(2)} / kg
                    </span>
                    {selectedItemId === item.id && <Check size={15} aria-hidden="true" />}
                  </li>
                )) : (
                  <li className="px-3 py-2 text-sm text-gray-500">No matching items.</li>
                )}
              </ul>
            )}
          </div>

          <p className="text-base sm:text-lg font-medium text-gray-900">
            Price: {selectedItem ? selectedItem.pricePerKg.toFixed(2) : "--"} / KG
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 sm:items-center mb-4">
          <div>
            <label htmlFor="service-item-qty" className="block mb-1 text-sm font-medium text-gray-700">
              Input Qty(kg):
            </label>
            <input
              id="service-item-qty"
              type="number"
              min={0.25}
              step={0.25}
              placeholder="0"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
            />
          </div>

          <p className="text-base sm:text-lg font-medium text-gray-900">
            Total: ₱{total.toFixed(2)}
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="service-item-type" className="block mb-1 text-sm font-medium text-gray-700">
            Service Type:
          </label>
          <select
            id="service-item-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
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
            className="flex-1 border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50 text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedItem || !quantityKg.trim() || Number(quantityKg) <= 0}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}