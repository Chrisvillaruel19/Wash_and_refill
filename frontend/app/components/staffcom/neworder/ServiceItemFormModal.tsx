"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { ServiceCategory, ServiceItemOption, ServiceType } from "../../../staff/(dashboard)/neworder/types";
import { useEscapeKey } from "../../../lib/useEscapeKey";
import { SELF_SERVICE_CATEGORY_ID, kgPerPrice } from "../../../staff/(dashboard)/neworder/data";

interface ServiceItemFormModalProps {
  category: ServiceCategory;
  itemOptions: ServiceItemOption[];
  onConfirm: (result: {
    itemId: string;
    itemName: string;
    quantityKg: number;
    // Not asked for Self Service — the item itself (Wash / Dry) is the operation.
    serviceType?: ServiceType;
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
  const [quantityKg, setQuantityKg] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceType | "">("");

  const isSelfService = category.id === SELF_SERVICE_CATEGORY_ID;
  // Catalog price covers this many kg (5 for Self Service, else 1).
  const priceKg = kgPerPrice(category.id);

  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? itemOptions.filter((item) => item.name.toLowerCase().includes(term)) : itemOptions;
  }, [itemOptions, search]);

  const selectedItem = itemOptions.find((item) => item.id === selectedItemId);

  const total = useMemo(() => {
    if (!selectedItem) return 0;
    // Rounded to the centavo, same as the backend's stored subtotal.
    return Math.round((selectedItem.pricePerKg / priceKg) * (Number(quantityKg) || 0) * 100) / 100;
  }, [selectedItem, quantityKg, priceKg]);

  const canConfirm = !!selectedItem && quantityKg > 0 && (isSelfService || !!serviceType);

  function handleConfirm() {
    if (!selectedItem || !canConfirm) return;
    onConfirm({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantityKg,
      serviceType: isSelfService ? undefined : serviceType || undefined,
      total,
    });
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
        <h2 className={`text-xl sm:text-2xl font-bold text-center uppercase text-gray-900 ${category.note ? "" : "mb-6"}`}>
          {category.name}
        </h2>
        {category.note && <p className="text-center text-sm text-gray-500 mb-6">{category.note}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 sm:items-center mb-4">
          {/* One search field: click it to see every service (the list
              scrolls), type to narrow it down, pick one to close it. */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls="service-item-list"
              aria-label="Search service"
              value={listOpen ? search : (selectedItem?.name ?? "")}
              onFocus={() => {
                setSearch("");
                setListOpen(true);
              }}
              onClick={() => setListOpen(true)}
              onBlur={() => setListOpen(false)}
              onChange={(e) => {
                setSearch(e.target.value);
                setListOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && listOpen) {
                  e.stopPropagation();
                  setListOpen(false);
                }
              }}
              placeholder="Search service…"
              className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-gray-900 placeholder:text-gray-500 text-sm"
            />
            {listOpen && (
              <ul
                id="service-item-list"
                role="listbox"
                className="list-scroll absolute z-10 mt-1 w-full max-h-[202px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <li
                      key={item.id}
                      role="option"
                      aria-selected={item.id === selectedItemId}
                      // mousedown, not click: it runs before the field's blur
                      // closes the list.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedItemId(item.id);
                        setListOpen(false);
                      }}
                      className={`px-3 py-2 cursor-pointer ${
                        item.id === selectedItemId ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {item.name}
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-3 text-sm text-gray-500">No services match.</li>
                )}
              </ul>
            )}
          </div>

          <p className="text-base sm:text-lg font-medium text-gray-900">
            Price: {(selectedItem?.pricePerKg ?? 0).toFixed(2)} / {priceKg > 1 ? `${priceKg}KG` : "KG"}
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
              value={quantityKg || ""}
              onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
              className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
            />
          </div>

          <p className="text-base sm:text-lg font-medium text-gray-900">
            Total: ₱{total.toFixed(2)}
          </p>
        </div>

        {isSelfService ? (
          <div className="mb-6" />
        ) : (
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
              <option value="" disabled>
                Select a service type
              </option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-lg py-2 font-medium hover:bg-gray-50 text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
