"use client";

import { useEffect, useRef, useState } from "react";
import { getOrders, getOrderDetailLines, OrderDetailLine } from "../../../lib/services/ordersApi.service";
import { getExpenses } from "../../../lib/services/expensesApi.service";
import { getInventory } from "../../../lib/services/inventoryApi.service";
import {
  getShiftHandoversPage,
  getMostRecentShiftHandover,
  createShiftHandover,
} from "../../../lib/services/shiftHandoverApi.service";
import { ApiError } from "../../../lib/apiClient";
import { Order, ExpenseRecord, InventoryItem } from "../types";
import Pagination from "../../../components/staffcom/Pagination";
import { useServerPage } from "../../../lib/useServerPage";

const PAGE_SIZE = 6;

// Matches the backend's own fallback (reconciliation.util.ts) for the
// drawer's starting balance before any handover has ever been submitted.
const FALLBACK_CASH_DRAWER_START = 5000;

interface DropOffRow {
  name: string;
  price: number;
  totalOrders: number;
  totalPrice: number;
}

function buildDropOffSummary(lines: OrderDetailLine[]): DropOffRow[] {
  const groups = new Map<string, { qty: number; subtotal: number }>();
  for (const line of lines) {
    if (line.type !== "PACKAGE") continue;
    const g = groups.get(line.name) ?? { qty: 0, subtotal: 0 };
    g.qty += line.quantity;
    g.subtotal += line.subtotal;
    groups.set(line.name, g);
  }
  return Array.from(groups.entries()).map(([name, g]) => ({
    name,
    price: g.qty > 0 ? g.subtotal / g.qty : 0,
    totalOrders: g.qty,
    totalPrice: g.subtotal,
  }));
}

export default function ShiftHandover() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // Only the single most recent record — GET /shift-handover?pageSize=1
  // instead of fetching the entire history just to find its max endTime.
  const [mostRecentHandover, setMostRecentHandover] = useState<{ actualCashCounted: number } | null>(null);
  const [unclaimedOrderLines, setUnclaimedOrderLines] = useState<Record<string, OrderDetailLine[]>>({});
  const [actualCashCounted, setActualCashCounted] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const isSubmittingRef = useRef(false);
  // Bumped after a successful submit to force the history table and the
  // most-recent-handover lookup to refetch, since a new handover changes
  // both even when the user is already viewing page 1.
  const [reloadKey, setReloadKey] = useState(0);

  // Handover History table — real server-side pagination (Item 6 follow-up):
  // each page turn is its own request, not a slice of a fully-loaded array.
  // No filter/search exists on this table, so there's no hybrid mode needed
  // here unlike Orders/Expenses' browsable lists.
  const {
    page,
    setPage,
    totalPages,
    items: history,
    loading: historyLoading,
  } = useServerPage(getShiftHandoversPage, PAGE_SIZE, true, reloadKey);

  useEffect(() => {
    async function load() {
      try {
        const [ordersData, expensesData, inventoryData, recentHandover] = await Promise.all([
          getOrders(),
          getExpenses(),
          getInventory(),
          getMostRecentShiftHandover(),
        ]);
        setOrders(ordersData);
        setExpenses(expensesData);
        setInventory(inventoryData);
        setMostRecentHandover(recentHandover);
      } catch {
        setLoadError("Unable to load shift handover data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // `orders` (and `expenses` below) are deliberately kept as a full fetch —
  // DO NOT convert this to server-side pagination (see Item 6 follow-up).
  // Cash reconciliation math must see every unclaimed record, not just
  // whatever page happens to be loaded; capping this would silently drop
  // real unclaimed orders/expenses out of the cash count. No backend
  // "unclaimed-only" endpoint exists to narrow this server-side yet — if
  // one is ever added, wire this to it instead of a paginated fetch.
  //
  // "Unclaimed" mirrors the backend's own lockUnclaimedPaidIds filter
  // exactly (paid, not cancelled, shiftHandoverId null) — this is the one
  // shared drawer's pending activity, from any staff member, not just mine.
  const unclaimedPaidOrders = orders.filter(
    (o) => !o.shiftHandoverId && o.payStatus === "Paid" && o.status !== "Cancelled"
  );

  // GET /orders (list) omits line items to stay lean — populated per unclaimed
  // order via GET /orders/:id. Naturally bounded (only since the last
  // handover, across all staff), unlike Sales' all-time order set.
  useEffect(() => {
    const missingIds = unclaimedPaidOrders.map((o) => o.id).filter((id) => !(id in unclaimedOrderLines));
    if (missingIds.length === 0) return;

    let cancelled = false;
    Promise.all(missingIds.map((id) => getOrderDetailLines(id).then((lines) => [id, lines] as const))).then(
      (results) => {
        if (cancelled) return;
        setUnclaimedOrderLines((prev) => {
          const next = { ...prev };
          for (const [id, lines] of results) next[id] = lines;
          return next;
        });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const allUnclaimedLines = unclaimedPaidOrders.flatMap((o) => unclaimedOrderLines[o.id] ?? []);
  const laundrySales = allUnclaimedLines
    .filter((l) => l.type === "PACKAGE")
    .reduce((sum, l) => sum + l.subtotal, 0);
  const supplySales = allUnclaimedLines
    .filter((l) => l.type === "INVENTORY")
    .reduce((sum, l) => sum + l.subtotal, 0);
  const customServiceSales = allUnclaimedLines
    .filter((l) => l.type === "SERVICE")
    .reduce((sum, l) => sum + l.subtotal, 0);

  const cashSalesTotal = unclaimedPaidOrders
    .filter((o) => (o.paymentMethod ?? "Cash") === "Cash")
    .reduce((sum, o) => sum + o.amount, 0);
  const totalSales = unclaimedPaidOrders.reduce((sum, o) => sum + o.amount, 0);
  const digitalSalesTotal = totalSales - cashSalesTotal;

  const dropOffSummary = buildDropOffSummary(allUnclaimedLines);

  // GET /expenses is self-scoped server-side for Staff (only their own) —
  // this really is "my pending expenses," not a filtering shortcut.
  const myUnclaimedExpenses = expenses.filter((e) => !e.shiftHandoverId);
  const expenseTotal = myUnclaimedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const drawerStart = mostRecentHandover === null ? FALLBACK_CASH_DRAWER_START : mostRecentHandover.actualCashCounted;

  // Withdrawals aren't visible to Staff (GET /withdrawals is Admin-only) —
  // excluded from this preview by necessity, disclosed below. The actual
  // submission is still fully correct: the backend recomputes this figure
  // itself from real data, including any pending withdrawals.
  const expectedCash = drawerStart + cashSalesTotal - expenseTotal;
  const shortage = actualCashCounted - expectedCash;

  async function handleSubmit() {
    if (isSubmittingRef.current) return;

    if (actualCashCounted < 0) {
      setSubmitError("Actual cash counted cannot be negative.");
      return;
    }
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 500) {
      setSubmitError("Notes must be at most 500 characters.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createShiftHandover({ actualCashCounted, notes: trimmedNotes || undefined });

      const [ordersData, expensesData, recentHandover] = await Promise.all([
        getOrders(),
        getExpenses(),
        getMostRecentShiftHandover(),
      ]);
      setOrders(ordersData);
      setExpenses(expensesData);
      setMostRecentHandover(recentHandover);
      setReloadKey((k) => k + 1);
      setActualCashCounted(0);
      setNotes("");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Unable to submit shift handover. Please try again."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-6">Loading shift handover data...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Shift Handover</h1>
      <p className="text-gray-500 mb-6">Attendance, Stock Inventory & Cash Management</p>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Shift Summary</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Cash drawer</p>
            <p className="text-lg font-bold text-gray-900">₱{drawerStart.toFixed(2)}</p>
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
            <p className="text-xs text-gray-400">Yours only</p>
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
                        <td className="p-2 whitespace-nowrap text-gray-900">₱{p.price.toFixed(2)}</td>
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

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
          Expected Cash below reflects only your own pending expenses and excludes any pending
          withdrawals — those aren&apos;t visible to your role. Both are still correctly included in
          the actual reconciliation once you submit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Expected Cash</p>
            <p className="text-xl font-bold text-gray-900">₱{expectedCash.toFixed(2)}</p>
          </div>
          <div>
            <label htmlFor="shift-actual-cash" className="block text-sm text-gray-500 mb-1">Actual Cash Counted</label>
            <input
              id="shift-actual-cash"
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
          <label htmlFor="shift-notes" className="block text-sm text-gray-500 mb-1">Notes</label>
          <textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 resize-none"
          />
        </div>

        {submitError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {submitError}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit records"}
        </button>
      </div>

      {(history.length > 0 || historyLoading) && (
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
              <tbody className={historyLoading ? "opacity-50" : undefined}>
                {history.map((h) => (
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
