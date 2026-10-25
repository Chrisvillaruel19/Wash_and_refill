"use client";

import { useEffect, useRef, useState } from "react";
import { getOrders, getOrderDetailLines, OrderDetailLine } from "../../../lib/services/ordersApi.service";
import { getExpenses } from "../../../lib/services/expensesApi.service";
import { getInventory } from "../../../lib/services/inventoryApi.service";
import {
  getShiftHandoversPage,
  getMostRecentShiftHandover,
  createShiftHandover,
  getPendingWithdrawals,
  getInventoryBeginning,
  PendingWithdrawals,
} from "../../../lib/services/shiftHandoverApi.service";
import { ApiError } from "../../../lib/apiClient";
import { Order, ExpenseRecord, InventoryItem, ShiftHandoverRecord } from "../types";
import Pagination from "../../../components/staffcom/Pagination";
import { useServerPage } from "../../../lib/useServerPage";
import { usePagination } from "../../../lib/usePagination";
import { useAutoRefresh } from "../../../lib/useAutoRefresh";
import FieldError from "../../../components/FieldError";
import AdminStatCard from "../../../components/admincom/AdminStatCard";
import { Wallet, Shirt, Package, Sparkles, Receipt } from "lucide-react";

const PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 5;

// "₱1,110.00" — thousands grouped, so big amounts stay readable.
const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

// difference = actual - expected: negative is a shortage, positive is an overage.
// Rounded to the centavo first, same as the backend's cashStatus rule
// (create-shift-handover.service.ts), so float noise never reads as "Over ₱0.00".
function describeCashDifference(difference: number) {
  const rounded = Math.round(difference * 100) / 100;
  if (rounded < 0) return { label: "Shortage", className: "text-red-600" };
  if (rounded > 0) return { label: "Over", className: "text-green-600" };
  return { label: "Balanced", className: "text-gray-500" };
}

// One row of the Expected Cash breakdown; with children, the row opens to
// list what it's made of.
function CashLine({
  label,
  value,
  sign,
  children,
}: {
  label: string;
  value: number;
  sign?: "+" | "−";
  children?: React.ReactNode;
}) {
  const amount = `${sign ? `${sign} ` : ""}₱${value.toFixed(2)}`;
  if (!children) {
    return (
      <div className="flex justify-between px-3 py-2 border-b border-gray-100 text-gray-700">
        <span>{label}</span>
        <span>{amount}</span>
      </div>
    );
  }
  return (
    <details className="border-b border-gray-100 text-gray-700">
      <summary className="flex justify-between px-3 py-2 cursor-pointer select-none">
        <span>
          {label} <span className="text-xs text-blue-600">(details)</span>
        </span>
        <span>{amount}</span>
      </summary>
      <ul className="px-3 pb-2 space-y-0.5 text-xs text-gray-500">{children}</ul>
    </details>
  );
}

export default function ShiftHandover() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // Only the single most recent record — GET /shift-handover?pageSize=1
  // instead of fetching the entire history just to find its max endTime.
  // Full record (not just actualCashCounted) so its inventorySnapshot can
  // supply this shift's beginning quantities — same "previous ending
  // becomes next beginning" read the backend itself uses, shown here only
  // as a preview (the actual submission always recomputes this server-side).
  const [mostRecentHandover, setMostRecentHandover] = useState<ShiftHandoverRecord | null>(null);
  // Backend-authoritative fixed cash float — the shop always begins a new
  // shift with this configured amount, never decided client-side (see
  // getMostRecentShiftHandover).
  const [defaultStartingCash, setDefaultStartingCash] = useState(0);
  const [unclaimedOrderLines, setUnclaimedOrderLines] = useState<Record<string, OrderDetailLine[]>>({});
  // Raw text, not a number: an empty field must stay distinguishable from a
  // genuinely counted ₱0 so a blank count can't be submitted as zero.
  const [actualCashInput, setActualCashInput] = useState("");
  // Shown under their own fields; submitError is only for server failures.
  const [actualCashError, setActualCashError] = useState("");
  const [notesError, setNotesError] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // The backend is the authoritative duplicate-prevention check (a second
  // real submission attempt is rejected regardless of this flag) — this is
  // only a same-session UI nicety so the form doesn't silently invite a
  // second click right after a successful submission.
  const [handoverSubmittedThisShift, setHandoverSubmittedThisShift] = useState(false);
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
        setMostRecentHandover(recentHandover.record);
        setDefaultStartingCash(recentHandover.defaultStartingCash);
      } catch {
        setLoadError("Unable to load shift handover data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
    refreshPendingWithdrawals();
  }, []);

  // Cash the Admin took out of the drawer this shift (earnings or a
  // claimed order's refund) — read live so Expected Cash matches the drawer.
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawals | null>(null);
  function refreshPendingWithdrawals() {
    getPendingWithdrawals()
      .then(setPendingWithdrawals)
      .catch(() => {});
  }

  // Live: sales, expenses and Admin withdrawals/refunds made while this page
  // is open show up within 30 seconds (the typed count and notes stay).
  useAutoRefresh(() => {
    refreshPendingWithdrawals();
    getOrders().then(setOrders).catch(() => {});
    getExpenses().then(setExpenses).catch(() => {});
  });

  // Beginning counts for the "Beginning → Now" table (null = not loaded).
  const [beginningQty, setBeginningQty] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    // Stock and its beginning count move together (a new item, a first
    // handover), so they're always refreshed as a pair.
    const refreshInventory = () => {
      void getInventory().then(setInventory).catch(() => {});
      void getInventoryBeginning().then(setBeginningQty).catch(() => {});
    };
    refreshInventory();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshInventory();
    };

    window.addEventListener("focus", refreshInventory);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = window.setInterval(refreshInventory, 15000);

    return () => {
      window.removeEventListener("focus", refreshInventory);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
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
  // Cancelled orders never count: their cash was taken out of the drawer
  // and set aside for the refund. A claimed order that was later refunded
  // ("Refunded") was still a sale — the refund is its own transaction
  // (never part of a shift — the Admin pays refunds).
  const unclaimedPaidOrders = orders.filter(
    (o) => !o.shiftHandoverId && o.status !== "Cancelled" && (o.payStatus === "Paid" || o.payStatus === "Refunded")
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

  const isCash = (o: { paymentMethod?: string }) => (o.paymentMethod ?? "Cash") === "Cash";
  const cashSalesTotal = unclaimedPaidOrders.filter(isCash).reduce((sum, o) => sum + o.amount, 0);
  const digitalSalesTotal = unclaimedPaidOrders.filter((o) => !isCash(o)).reduce((sum, o) => sum + o.amount, 0);

  const dropOffSummary = buildDropOffSummary(allUnclaimedLines);

  // 5 supplies per page, so a long supply list never stretches the page.
  const {
    page: suppliesPage,
    setPage: setSuppliesPage,
    totalPages: suppliesTotalPages,
    paginatedItems: pagedSupplies,
  } = usePagination(inventory, TABLE_PAGE_SIZE);

  // Every expense paid from the shared drawer since the last handover, any
  // staff — the same total the server subtracts on submit. GET /expenses
  // only returns this staff member's own, so that's just the fallback until
  // the server total loads.
  const myUnclaimedExpenses = expenses.filter((e) => !e.shiftHandoverId);
  const expenseTotal =
    pendingWithdrawals?.expensesTotal ?? myUnclaimedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // What the drawer held when this shift started, from the server (the
  // same figure it uses on submit): the last count minus the sales the
  // Admin withdrew from it since. The starting cash when every sale was
  // withdrawn; more when some weren't; less when a refund or expense used
  // part of it. The fixed starting cash is only the fallback until it loads.
  const drawerStart = pendingWithdrawals?.startingCash ?? defaultStartingCash;
  const startingFloat = pendingWithdrawals?.startingCashFloat ?? defaultStartingCash;
  const carriedOver = pendingWithdrawals?.startingCashCarriedOver ?? 0;
  const startingCashNote =
    carriedOver > 0
      ? `${peso(startingFloat)} + ${peso(carriedOver)} sales not yet withdrawn`
      : carriedOver < 0
        ? `${peso(-carriedOver)} below the ${peso(startingFloat)} starting cash`
        : "In the drawer at shift start";

  // GCash never touches the drawer; shown after the refunds the Admin sent
  // from the shop's GCash since the last handover.
  const gcashRefundsTotal = pendingWithdrawals?.gcashRefundsTotal ?? 0;
  const gcashAfterRefunds = digitalSalesTotal - gcashRefundsTotal;

  // This shift's beginning quantity per item, computed server-side by the
  // same rule the snapshot uses on submit (inventory-beginning.util.ts):
  // the last handover's ending count, or — if none counted the item — stock
  // plus what this period's orders used. Until it loads, the last snapshot.
  const beginningQtyByInventoryId =
    beginningQty ??
    new Map((mostRecentHandover?.inventorySnapshot ?? []).map((row) => [row.inventoryId, row.endingQty]));

  // Same formula the backend uses on submit (it recomputes it itself from
  // real data): starting cash + cash sales − expenses − cash the Admin took
  // out − cash refunds handed to customers this shift.
  const drawerWithdrawalTotal = pendingWithdrawals?.total ?? 0;
  const refundsPaidTotal = pendingWithdrawals?.refundsPaidTotal ?? 0;
  const expectedCash = drawerStart + cashSalesTotal - expenseTotal - drawerWithdrawalTotal - refundsPaidTotal;
  const hasActualCash = actualCashInput.trim() !== "";
  const actualCashCounted = hasActualCash ? Number(actualCashInput) : 0;
  const shortage = actualCashCounted - expectedCash;

  async function handleSubmit() {
    if (isSubmittingRef.current) return;

    const nextActualCashError = !actualCashInput
      ? "Actual cash counted is required."
      : !hasActualCash || !Number.isFinite(actualCashCounted)
        ? "Actual cash counted must be a valid amount."
        : actualCashCounted < 0
          ? "Actual cash counted cannot be negative."
          : "";
    const trimmedNotes = notes.trim();
    const nextNotesError = trimmedNotes.length > 500 ? "Notes must be at most 500 characters." : "";
    setActualCashError(nextActualCashError);
    setNotesError(nextNotesError);
    setSubmitError("");
    if (nextActualCashError || nextNotesError) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createShiftHandover({ actualCashCounted, notes: trimmedNotes || undefined });

      const [ordersData, expensesData, inventoryData, recentHandover] = await Promise.all([
        getOrders(),
        getExpenses(),
        getInventory(),
        getMostRecentShiftHandover(),
      ]);
      setOrders(ordersData);
      setExpenses(expensesData);
      setInventory(inventoryData);
      setMostRecentHandover(recentHandover.record);
      setDefaultStartingCash(recentHandover.defaultStartingCash);
      setReloadKey((k) => k + 1);
      refreshPendingWithdrawals();
      getInventoryBeginning().then(setBeginningQty).catch(() => {});
      setActualCashInput("");
      setNotes("");
      setHandoverSubmittedThisShift(true);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Unable to submit shift handover. Please try again."
      );
      // Backend is authoritative: if it rejected this as a duplicate (e.g.
      // this tab's local flag was reset by a reload but the shift itself
      // hasn't changed), reflect that truth in the UI too.
      if (err instanceof ApiError && err.message.includes("already been submitted for your current shift")) {
        setHandoverSubmittedThisShift(true);
      }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Shift Handover</h1>
      <p className="text-gray-600 mb-6">Count your drawer and supplies, then submit at the end of your shift.</p>

      {/* This shift's money at a glance — same cards as the Dashboard. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <AdminStatCard
          compact
          label="Starting cash"
          value={peso(drawerStart)}
          icon={Wallet}
          iconColor="text-sky-600 bg-sky-100"
          sub={startingCashNote}
        />
        <AdminStatCard
          compact
          label="Laundry sales"
          value={peso(laundrySales)}
          icon={Shirt}
          iconColor="text-blue-600 bg-blue-100"
          sub="Drop-off packages"
        />
        <AdminStatCard
          compact
          label="Supply sales"
          value={peso(supplySales)}
          icon={Package}
          iconColor="text-emerald-600 bg-emerald-100"
          sub="Detergent, Downy, etc."
        />
        <AdminStatCard
          compact
          label="Custom service sales"
          value={peso(customServiceSales)}
          icon={Sparkles}
          iconColor="text-violet-600 bg-violet-100"
          sub="Per-kg services"
        />
        <div className="col-span-2 lg:col-span-1">
          <AdminStatCard
          compact
            label="Expenses"
            value={peso(expenseTotal)}
            icon={Receipt}
            iconColor="text-amber-600 bg-amber-100"
            sub="Paid from the drawer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">Supplies (Beginning → Now)</h2>
          <p className="text-xs text-gray-600 mt-0.5 mb-4">
            Beginning is the last handover&apos;s ending count. Your count when you submit becomes the next
            shift&apos;s beginning.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="p-3 text-left font-semibold whitespace-nowrap">Item</th>
                  <th className="p-3 text-left font-semibold whitespace-nowrap">Unit</th>
                  <th className="p-3 text-right font-semibold whitespace-nowrap">Unit price</th>
                  <th className="p-3 text-right font-semibold whitespace-nowrap">Beginning</th>
                  <th className="p-3 text-right font-semibold whitespace-nowrap">Now</th>
                  <th className="p-3 text-right font-semibold whitespace-nowrap">Used</th>
                  <th className="p-3 text-right font-semibold whitespace-nowrap">Value now</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length > 0 ? (
                  pagedSupplies.map((item) => {
                    const beginning = beginningQtyByInventoryId.get(item.id) ?? item.currentStock;
                    const used = beginning - item.currentStock;
                    return (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="p-3 text-gray-900 whitespace-nowrap">{item.name}</td>
                        <td className="p-3 text-gray-700 whitespace-nowrap">{item.unit}</td>
                        <td className="p-3 text-right text-gray-900 whitespace-nowrap">₱{item.price.toFixed(2)}</td>
                        <td className="p-3 text-right text-gray-900">{beginning}</td>
                        <td className="p-3 text-right text-gray-900 font-semibold">{item.currentStock}</td>
                        <td className={`p-3 text-right ${used > 0 ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          {used > 0 ? `−${used}` : used < 0 ? `+${-used}` : "0"}
                        </td>
                        <td className="p-3 text-right text-gray-900 whitespace-nowrap">
                          ₱{(item.currentStock * item.price).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No supplies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={suppliesPage} totalPages={suppliesTotalPages} onPageChange={setSuppliesPage} />
        </div>

        <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">Drop-off Summary</h2>
          <p className="text-xs text-gray-600 mt-0.5 mb-4">Packages paid for this shift.</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="p-3 text-left font-semibold">Package</th>
                  <th className="p-3 text-right font-semibold">Price</th>
                  <th className="p-3 text-right font-semibold">Orders</th>
                  <th className="p-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {dropOffSummary.length > 0 ? (
                  dropOffSummary.map((p) => (
                    <tr key={p.name} className="border-t border-gray-100">
                      <td className="p-3 text-gray-900">{p.name}</td>
                      <td className="p-3 text-right text-gray-900 whitespace-nowrap">₱{p.price.toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-900">{p.totalOrders}</td>
                      <td className="p-3 text-right text-gray-900 font-semibold whitespace-nowrap">
                        ₱{p.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      No drop-off orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Cash Reconciliation</h2>

        {/* How Expected Cash is reached, top to bottom — drawer cash only,
            same formula the server uses on submit. Lines that took cash out
            list their items in a collapsible row so the sum stays readable. */}
        <div className="border border-gray-200 rounded-lg mb-4 text-sm tabular-nums">
          {carriedOver !== 0 ? (
            <CashLine label="Starting cash" value={drawerStart}>
              <li className="flex justify-between gap-3">
                <span>Starting cash</span>
                <span>₱{startingFloat.toFixed(2)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>{carriedOver > 0 ? "Sales not yet withdrawn by Admin" : "Used by a refund or expense (new cash sales fill it back first)"}</span>
                <span>
                  {carriedOver > 0 ? "+" : "−"} ₱{Math.abs(carriedOver).toFixed(2)}
                </span>
              </li>
            </CashLine>
          ) : (
            <CashLine label="Starting cash" value={drawerStart} />
          )}
          <CashLine label="Cash sales" value={cashSalesTotal} sign="+" />
          {refundsPaidTotal > 0 && (
            <CashLine label="Refunds (Cash)" value={refundsPaidTotal} sign="−">
              {pendingWithdrawals?.refundsPaid.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>
                    {new Date(p.paidOutAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {p.customerName} —{" "}
                    {p.reason}
                  </span>
                  <span>₱{p.amount.toFixed(2)}</span>
                </li>
              ))}
            </CashLine>
          )}
          {expenseTotal > 0 && <CashLine label="Expenses" value={expenseTotal} sign="−" />}
          {drawerWithdrawalTotal > 0 && (
            <CashLine label="Taken out by Admin" value={drawerWithdrawalTotal} sign="−">
              {pendingWithdrawals?.withdrawals.map((w) => (
                <li key={w.id} className="flex justify-between gap-3">
                  <span>
                    {new Date(w.withdrawalDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {w.reason}
                  </span>
                  <span>₱{w.amount.toFixed(2)}</span>
                </li>
              ))}
            </CashLine>
          )}
          <div className="flex justify-between px-3 py-2 bg-gray-50 font-semibold text-gray-900 rounded-b-lg">
            <span>Expected cash in drawer</span>
            <span>₱{expectedCash.toFixed(2)}</span>
          </div>
        </div>

        {pendingWithdrawals && pendingWithdrawals.refundsToGiveTotal > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4">
            ₱{pendingWithdrawals.refundsToGiveTotal.toFixed(2)} in approved refunds hasn&apos;t been given to customers yet
            (see Refunds to give on your Dashboard). That cash is still in the drawer, so count it — whoever is on duty
            when the customer comes will give it.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Expected Cash</p>
            <p className="text-xl font-bold text-gray-900">₱{expectedCash.toFixed(2)}</p>
          </div>
          <div>
            <label htmlFor="shift-actual-cash" className="block text-sm text-gray-500 mb-1">
              Actual Cash Counted <span className="text-red-500">*</span>
            </label>
            <input
              id="shift-actual-cash"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              required
              aria-invalid={!!actualCashError}
              aria-describedby={actualCashError ? "shift-actual-cash-error" : undefined}
              value={actualCashInput}
              onChange={(e) => {
                setActualCashInput(e.target.value);
                setActualCashError("");
              }}
              className={`w-full border rounded-lg p-2 text-gray-900 ${
                actualCashError ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
              }`}
            />
            <FieldError id="shift-actual-cash-error" message={actualCashError} />
          </div>
          <div>
            <p className="text-sm text-gray-500">
              {hasActualCash ? describeCashDifference(shortage).label : "Shortage / Over"}
            </p>
            {hasActualCash ? (
              <p className={`text-xl font-bold ${describeCashDifference(shortage).className}`}>
                ₱{Math.abs(shortage).toFixed(2)}
              </p>
            ) : (
              <p className="text-xl font-bold text-gray-400">—</p>
            )}
          </div>
          {/* GCash goes to the shop's GCash, never the drawer — so it stays
              out of the sum above and is shown here on its own, after the
              refunds the Admin sent from GCash since the last handover. */}
          <div>
            <p className="text-sm text-gray-500">GCash sales (not in drawer)</p>
            <p className="text-xl font-bold text-gray-900">
              {gcashAfterRefunds < 0 ? "−" : ""}₱{Math.abs(gcashAfterRefunds).toFixed(2)}
            </p>
            {gcashRefundsTotal > 0 && (
              <p
                className="text-xs text-gray-500"
                title={pendingWithdrawals?.gcashRefunds
                  .map((g) => `${g.customerName} — ${g.reason}: ₱${g.amount.toFixed(2)}`)
                  .join("\n")}
              >
                ₱{digitalSalesTotal.toFixed(2)} sales − ₱{gcashRefundsTotal.toFixed(2)} refunded
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="shift-notes" className="block text-sm text-gray-500 mb-1">Notes</label>
          <textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesError("");
            }}
            rows={2}
            maxLength={500}
            aria-invalid={!!notesError}
            aria-describedby={notesError ? "shift-notes-error" : undefined}
            className={`w-full border rounded-lg p-2 text-gray-900 resize-none ${notesError ? "border-red-500" : "border-gray-300"}`}
          />
          <FieldError id="shift-notes-error" message={notesError} />
        </div>

        {submitError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {submitError}
          </p>
        )}

        {handoverSubmittedThisShift && (
          <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
            Shift handover already submitted for your current shift. Clock out to end this shift, or
            clock in again to start a new one before submitting another.
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || handoverSubmittedThisShift}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Submitting..."
            : handoverSubmittedThisShift
            ? "Already submitted"
            : "Submit records"}
        </button>
      </div>

      {(history.length > 0 || historyLoading) && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Handover History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="p-2 whitespace-nowrap">Date</th>
                  <th className="p-2 whitespace-nowrap">Staff</th>
                  <th className="p-2 whitespace-nowrap">Expected Cash</th>
                  <th className="p-2 whitespace-nowrap">Actual Counted</th>
                  <th className="p-2 whitespace-nowrap">Shortage / Over</th>
                </tr>
              </thead>
              <tbody className={historyLoading ? "opacity-50" : undefined}>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
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
                        describeCashDifference(h.shortage).className
                      }`}
                    >
                      {describeCashDifference(h.shortage).label} ₱{Math.abs(h.shortage).toFixed(2)}
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
