"use client";

import { useEffect, useState } from "react";
import { getStoredOrders } from "../localOrders";
import { getStoredExpenses } from "../localExpense";
import { getStoredInventory } from "../localInventory";
import { submitShiftHandover, getStoredShiftHandovers } from "../localShiftHandover";
import { getCurrentUser } from "../../../lib/auth";
import { packages } from "../neworder/data";
import { Order, ExpenseRecord, InventoryItem, ShiftHandoverRecord } from "../types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

// No cash-drawer tracking feature exists yet, so this is a fixed starting float
// until that's built. Withdrawals aren't tracked anywhere yet either, so that
// figure is 0 for now rather than fabricated.
const CASH_DRAWER_START = 5000;
const PAGE_SIZE = 6;

export default function ShiftHandover() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<ShiftHandoverRecord[]>([]);
  const [actualCashCounted, setActualCashCounted] = useState(0);
  const [notes, setNotes] = useState("");

  const staffName = getCurrentUser()?.name || "Unknown";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrders(getStoredOrders());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpenses(getStoredExpenses());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInventory(getStoredInventory());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getStoredShiftHandovers());
  }, []);

  // Order items are stored as either the plain package name ("Basic") or,
  // when multiple of the same package were added to one order, with a
  // quantity suffix ("Basic ×5"). This extracts the quantity either way.
  function getItemQuantity(itemStr: string, name: string): number {
    if (itemStr === name) return 1;
    const prefix = `${name} ×`;
    if (itemStr.startsWith(prefix)) {
      const num = parseInt(itemStr.slice(prefix.length), 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  const dropOffSummary = packages
    .map((pkg) => {
      const totalQty = orders.reduce((sum, o) => {
        const orderQty = (o.items || []).reduce(
          (s, itemStr) => s + getItemQuantity(itemStr, pkg.name),
          0
        );
        return sum + orderQty;
      }, 0);
      return {
        name: pkg.name,
        price: pkg.price,
        totalOrders: totalQty,
        totalPrice: totalQty * pkg.price,
      };
    })
    .filter((p) => p.totalOrders > 0);

  const totalSales = orders.reduce((sum, o) => sum + o.amount, 0);
  const laundrySales = dropOffSummary.reduce((sum, p) => sum + p.totalPrice, 0);
  // Everything that isn't a recognized package (Basic/Double/Ultra/Legendary).
  // This currently lumps custom per-kg laundry services in with supply sales
  // since there's no separate "service revenue" category yet — labeled
  // "Other sales" in the UI below rather than "Supply sales" so it isn't
  // presented as more precise than it actually is.
  const supplySales = Math.max(0, totalSales - laundrySales);
  const withdrawals = 0;
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expectedCash =
    CASH_DRAWER_START + laundrySales + supplySales - withdrawals - expenseTotal;
  const shortage = actualCashCounted - expectedCash;

  function handleSubmit() {
    const updated = submitShiftHandover({
      staffName,
      cashDrawer: CASH_DRAWER_START,
      laundrySales,
      supplySales,
      withdrawals,
      expense: expenseTotal,
      expectedCash,
      actualCashCounted,
      shortage,
      notes,
    });
    setHistory(updated);
    setActualCashCounted(0);
    setNotes("");
  }

  const { page, setPage, totalPages, paginatedItems } = usePagination(history, PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Shift Handover</h1>
      <p className="text-gray-500 mb-6">Attendance, Stock Inventory & Cash Management</p>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Shift Summary</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Cash drawer</p>
            <p className="text-lg font-bold text-gray-900">₱{CASH_DRAWER_START.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Laundry sales</p>
            <p className="text-lg font-bold text-gray-900">₱{laundrySales.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Other sales</p>
            <p className="text-lg font-bold text-gray-900">₱{supplySales.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expense</p>
            <p className="text-lg font-bold text-gray-900">₱{expenseTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Stock Inventory Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-2 whitespace-nowrap">Item</th>
                    <th className="p-2 whitespace-nowrap">Unit</th>
                    <th className="p-2 whitespace-nowrap">Current Stock</th>
                    <th className="p-2 whitespace-nowrap">Unit Price</th>
                    <th className="p-2 whitespace-nowrap">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-2 whitespace-nowrap text-gray-900">{item.name}</td>
                      <td className="p-2 whitespace-nowrap text-gray-900">{item.unit}</td>
                      <td className="p-2 whitespace-nowrap text-gray-900">{item.currentStock}</td>
                      <td className="p-2 whitespace-nowrap text-gray-900">₱{item.price}</td>
                      <td className="p-2 whitespace-nowrap text-gray-900">
                        ₱{(item.currentStock * item.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Drop off Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-700 border-b bg-gray-50">
                    <th className="p-2 whitespace-nowrap">Pack Name</th>
                    <th className="p-2 whitespace-nowrap">Price</th>
                    <th className="p-2 whitespace-nowrap">Total orders</th>
                    <th className="p-2 whitespace-nowrap">Total price</th>
                  </tr>
                </thead>
                <tbody>
                  {dropOffSummary.length > 0 ? (
                    dropOffSummary.map((p) => (
                      <tr key={p.name} className="border-b last:border-0">
                        <td className="p-2 whitespace-nowrap text-gray-900">{p.name}</td>
                        <td className="p-2 whitespace-nowrap text-gray-900">₱{p.price}</td>
                        <td className="p-2 whitespace-nowrap text-gray-900">{p.totalOrders}</td>
                        <td className="p-2 whitespace-nowrap text-gray-900">
                          ₱{p.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        No drop-off orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Cash Reconciliation</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Expected Cash</p>
            <p className="text-xl font-bold text-gray-900">₱{expectedCash.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Actual Cash Counted</label>
            <input
              type="number"
              min={0}
              value={actualCashCounted || ""}
              onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">Shortage</p>
            <p className={`text-xl font-bold ${shortage < 0 ? "text-red-600" : "text-green-600"}`}>
              ₱{shortage.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Submit records
        </button>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Handover History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-700 border-b bg-gray-50">
                  <th className="p-2 whitespace-nowrap">Date</th>
                  <th className="p-2 whitespace-nowrap">Staff</th>
                  <th className="p-2 whitespace-nowrap">Expected Cash</th>
                  <th className="p-2 whitespace-nowrap">Actual Counted</th>
                  <th className="p-2 whitespace-nowrap">Shortage</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      {new Date(h.timestamp).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900">{h.staffName}</td>
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      ₱{h.expectedCash.toFixed(2)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900">
                      ₱{h.actualCashCounted.toFixed(2)}
                    </td>
                    <td
                      className={`p-2 whitespace-nowrap font-medium ${
                        h.shortage < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      ₱{h.shortage.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
