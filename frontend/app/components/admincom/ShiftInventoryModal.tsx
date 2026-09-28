"use client";

import { useEscapeKey } from "../../lib/useEscapeKey";
import { ShiftHandoverInventoryRow } from "../../staff/(dashboard)/types";

interface ShiftInventoryModalProps {
  staffName: string;
  timestamp: string;
  rows: ShiftHandoverInventoryRow[];
  totalSales: number;
  onClose: () => void;
}

// Compact, scrollable detail view for one handover's full immutable
// inventory snapshot — kept out of the Cashier Shift Summary card itself so
// that grid stays short regardless of how many inventory items the shop
// tracks. Reuses the same fixed-overlay modal shell already used throughout
// Admin (see AdminWithdrawalFormModal, ConfirmDeleteModal) instead of
// introducing a new UI pattern/dependency.
export default function ShiftInventoryModal({
  staffName,
  timestamp,
  rows,
  totalSales,
  onClose,
}: ShiftInventoryModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[85vh] flex flex-col">
        <h2 className="text-xl font-bold mb-1 text-gray-900">Inventory Snapshot</h2>
        <p className="text-sm text-gray-500 mb-4">
          {new Date(timestamp).toLocaleDateString()} — {staffName}
        </p>

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="text-gray-700 border-b bg-gray-50">
                <th className="p-2 whitespace-nowrap">Item</th>
                <th className="p-2 whitespace-nowrap">Beginning</th>
                <th className="p-2 whitespace-nowrap">Ending</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  // Keyed by the snapshot row's inventoryId (always present,
                  // unique per item) — never by itemName: two active items may
                  // now legitimately share a display name with different units
                  // (e.g. "Liquid Detergent" Sachet vs bottle), and a name key
                  // would collide, making React misbehave on list updates.
                  <tr key={row.inventoryId} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      {row.itemName}
                      <span className="text-gray-400"> ({row.unit})</span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{row.beginningQty}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{row.endingQty}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No inventory items recorded for this handover.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 mt-4 pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Total Sales</span>
          <span className="text-lg font-bold text-gray-900">₱{totalSales.toFixed(2)}</span>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
