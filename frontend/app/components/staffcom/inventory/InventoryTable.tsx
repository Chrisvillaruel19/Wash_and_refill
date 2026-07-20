"use client";

import { Search, Boxes, Pencil } from "lucide-react";
import { InventoryItem } from "../../../staff/(dashboard)/types";

interface InventoryTableProps {
  items: InventoryItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onRestockClick: (item: InventoryItem) => void;
  onEditClick: (item: InventoryItem) => void;
}

export default function InventoryTable({
  items,
  search,
  onSearchChange,
  onRestockClick,
  onEditClick,
}: InventoryTableProps) {
  return (
    <div>
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search Item name"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-3 sm:p-4 whitespace-nowrap">Item Name</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Current Stock</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Low Stock Alert</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Unit</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Price</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => {
                  const isLow = item.currentStock <= item.lowStockAlert;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3 sm:p-4 font-medium whitespace-nowrap">{item.name}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{item.currentStock}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{item.lowStockAlert}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{item.unit}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">₱{item.price}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            isLow
                              ? "text-red-600 border-red-300 bg-red-50"
                              : "text-green-600 border-green-300 bg-green-50"
                          }`}
                        >
                          {isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onRestockClick(item)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            <Boxes size={16} /> Restock
                          </button>
                          <button
                            onClick={() => onEditClick(item)}
                            className="text-gray-500 hover:text-gray-800"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}