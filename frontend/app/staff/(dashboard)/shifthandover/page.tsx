"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredOrders } from "../localOrders";
import { getStoredExpenses } from "../localExpense";
import { getStoredInventory } from "../localInventory";
import {
  submitShiftHandover,
  getStoredShiftHandovers,
  getLastHandoverTimestamp,
  getCashDrawerStart,
} from "../localShiftHandover";
import { getCurrentUser } from "../../../lib/auth";
import { getStoredPackages } from "../../../lib/localPackages";
import { Package } from "../neworder/types";
import { supplies } from "../neworder/data";
import { Order, ExpenseRecord, InventoryItem, ShiftHandoverRecord } from "../types";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

// Withdrawals aren't tracked anywhere yet, so that figure is 0 for now
// rather than fabricated.
const PAGE_SIZE = 6;

export default function ShiftHandover() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<ShiftHandoverRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [actualCashCounted, setActualCashCounted] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackages(getStoredPackages());
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

  // Shift scoping (Option B, confirmed): "my current shift" = everything
  // since MY most recently submitted handover, or everything if I've never
  // submitted one. Shared with Attendance's clock-out guard via
  // localShiftHandover.ts so both use the same "unreported" definition.
  const lastHandoverTimestamp = getLastHandoverTimestamp(staffName, history);

  // One shared physical drawer: starting cash = whatever the single most
  // recent handover (any staff member) actually counted at close-out.
  const cashDrawerStart = getCashDrawerStart(history);

  // Orders created before the createdAt field existed have no reliable
  // timestamp to compare — treated as outside the current shift rather
  // than guessed at.
  const shiftOrders = orders.filter(
    (o) =>
      o.staffName === staffName &&
      !!o.createdAt &&
      (!lastHandoverTimestamp || o.createdAt > lastHandoverTimestamp)
  );

  // Cash reconciliation only counts money actually collected — an UnPaid
  // order hasn't put anything in the drawer yet, and a Cancelled order never
  // happened at all. Same "Paid, not Cancelled" rule as computeStatsFromOrders.
  const paidShiftOrders = shiftOrders.filter(
    (o) => o.payStatus === "Paid" && o.status !== "Cancelled"
  );

  // GCash/digital payments don't put physical cash in the drawer — only
  // Cash-method sales count toward the cash reconciliation below. Orders
  // from before paymentMethod existed are treated as Cash, matching how
  // every order was already implicitly counted before this field existed
  // (not silently dropped from the cash count).
  const cashPaidShiftOrders = paidShiftOrders.filter(
    (o) => (o.paymentMethod ?? "Cash") === "Cash"
  );
  const cashSalesTotal = cashPaidShiftOrders.reduce((sum, o) => sum + o.amount, 0);

  const shiftExpenses = expenses.filter(
    (e) =>
      e.submittedBy === staffName &&
      (!lastHandoverTimestamp || e.timestamp > lastHandoverTimestamp)
  );

  const dropOffSummary = packages
    .map((pkg) => {
      const totalQty = paidShiftOrders.reduce((sum, o) => {
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

  const totalSales = paidShiftOrders.reduce((sum, o) => sum + o.amount, 0);
  const digitalSalesTotal = totalSales - cashSalesTotal;
  const laundrySales = dropOffSummary.reduce((sum, p) => sum + p.totalPrice, 0);

  // Raw supplies sold individually (not part of a package) — matched the
  // same way packages are matched above: exact name, or "name ×N" for
  // multiples. Priced at each supply's current catalog price.
  const supplySales = supplies.reduce((sum, supply) => {
    const qty = paidShiftOrders.reduce((s, o) => {
      const orderQty = (o.items || []).reduce(
        (x, itemStr) => x + getItemQuantity(itemStr, supply.name),
        0
      );
      return s + orderQty;
    }, 0);
    return sum + qty * supply.price;
  }, 0);

  // Custom per-kg services (rugs, carpets, bulk household items) don't have
  // a fixed catalog entry the way packages/supplies do — price is set per
  // order at checkout, so there's nothing to match by name. Their revenue is
  // whatever's left after accounting for known packages and known supplies.
  // Floored at 0 as a safety net.
  const customServiceSales = Math.max(0, totalSales - laundrySales - supplySales);

  const withdrawals = 0;
  const expenseTotal = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Only Cash-method sales count toward the physical drawer — GCash sales
  // are real revenue (shown above) but never touch this cash count.
  const expectedCash = cashDrawerStart + cashSalesTotal - withdrawals - expenseTotal;
  const shortage = actualCashCounted - expectedCash;

  function handleSubmit() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const updated = submitShiftHandover({
      staffName,
      cashDrawer: cashDrawerStart,
      laundrySales,
      supplySales,
      customServiceSales,
      digitalSales: digitalSalesTotal,
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
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }

  const { page, setPage, totalPages, paginatedItems } = usePagination(history, PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Shift Handover</h1>
      <p className="text-gray-500 mb-6">Attendance, Stock Inventory & Cash Management</p>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Shift Summary</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Cash drawer</p>
            <p className="text-lg font-bold text-gray-900">₱{cashDrawerStart.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Laundry sales</p>
            <p className="text-lg font-bold text-gray-900">₱{laundrySales.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Supply sales</p>
            <p className="text-lg font-bold text-gray-900">₱{supplySales.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Custom service sales</p>
            <p className="text-lg font-bold text-gray-900">₱{customServiceSales.toFixed(2)}</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
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
          <div>
            <p className="text-sm text-gray-500">GCash / digital (excluded above)</p>
            <p className="text-xl font-bold text-gray-900">₱{digitalSalesTotal.toFixed(2)}</p>
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
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit records"}
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
