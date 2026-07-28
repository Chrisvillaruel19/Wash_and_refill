# Wash & Refill Laundry Management System — System Documentation

This document explains how the system works, why it was built this way, and what changed during the recent cross-feature data-flow fix pass. It's written for a review panel — plain language first, technical detail where it matters.

---

## 1. System Overview

WRLMS is a laundry shop management app with two sides:

- **Staff** — creates orders, manages service status, records expenses, tracks attendance, and submits shift handovers (cash reconciliation).
- **Admin** — oversees inventory, packages/pricing, employees, sales reporting, and audit logs.

**Current architecture (frontend-only, pre-backend):** every feature is built against a small service-layer file (`local*.ts` — e.g. `localOrders.ts`, `localInventory.ts`, `localShiftHandover.ts`) that reads and writes `localStorage` and exposes plain functions like `getStoredOrders()` or `addStoredOrder()`. Pages never touch `localStorage` directly. This was deliberate: when a real backend/API exists, only the *bodies* of these functions change (an HTTP call instead of a `localStorage` read/write) — the pages that call them don't need to change at all.

This matters for the panel because it means the business logic decisions documented below (shift scoping, revenue filtering, stock deduction) are not throwaway frontend hacks — they're the actual rules the eventual backend needs to implement too.

---

## 2. Core Logic: New Order → Inventory Deduction

**Where:** `app/staff/(dashboard)/neworder/page.tsx` (creation) and `app/staff/(dashboard)/localInventory.ts` (the deduction logic itself, `applyOrderStockImpact`).

**How it works:**

1. A cart item is either a **package** (Basic/Double/Ultra/Legendary — each has a fixed `liquidDetergent` and `downy` count) or a **raw supply** (Fabcon, Bleach, Plastic, etc., sold individually).
2. When "Finish Transaction" is pressed, the order is saved, then `applyOrderStockImpact(order.items, +1)` runs:
   - For each package sold, it deducts `liquidDetergent × quantity` sachets and `downy × quantity` liters from inventory.
   - For each raw supply sold, it deducts the matching inventory item directly.
3. The **same function runs in reverse** (`direction = -1`) when an order is cancelled — restoring exactly what was deducted, because it's the same math with the sign flipped. This guarantees deduction and restoration can never drift out of sync with each other, since there's only one function, not two hand-written mirror copies.

**A data-model wrinkle worth knowing about:** the inventory list has two rows both named "Liquid Detergent" — one tracked in Sachets, one in Liters (a pre-existing seed-data quirk, not something introduced by this fix). Packages' detergent counts (1–4) only make sense as sachets-per-load, so the deduction logic specifically targets the Sachet-tracked row. This is flagged in code comments and in the Known Limitations section below — a real backend should resolve this by giving these two rows distinct, unambiguous names or SKUs.

---

## 3. Core Logic: Order → Sales → Shift Handover (the Option B shift model)

This is the part most likely to get panel questions, so it's covered in detail.

### The problem it solves

Before this fix, Shift Handover showed **every order ever created by anyone**, every time, for every staff member. Two bugs fell out of that:
- Two staff members working the same day would each see the other's sales in their own cash reconciliation.
- If one staff member submitted two handovers in a day, the second one would re-count everything already reported in the first — inflating "expected cash" and making shortages impossible to reconcile correctly.

### The fix: "my current shift" = since my last submitted handover

Every `Order` now carries a real, sortable `createdAt` timestamp (ISO format, same style already used by `ExpenseRecord.timestamp`). Shift Handover computes:

```
lastHandoverTimestamp = the most recent ShiftHandoverRecord.timestamp
                         submitted by THIS staff member (or null if they've
                         never submitted one)

shiftOrders = orders where staffName === me
                        AND createdAt > lastHandoverTimestamp (or all, if null)
```

The same rule is reused (not re-implemented) for expenses, and — as of this fix pass — for the Attendance clock-out guard (see §6). It now lives in one place, `localShiftHandover.ts`, exported as `getLastHandoverTimestamp` and `getUnreportedActivity`, so every page that needs "what hasn't this person reported yet" asks the same function instead of maintaining its own copy of the rule.

### Why this option, and not tying shifts to clock-in/out (Option A)

Two designs were on the table:

- **Option A** — a "shift" is bounded by Attendance clock-in/clock-out. Clean in theory, but it assumes every sale happens strictly between a clock-in and the matching clock-out, and it means a forgotten clock-out (see §5) would corrupt shift boundaries for sales too, not just hours.
- **Option B (chosen)** — a "shift" is bounded by the staff member's own submitted handovers, independent of Attendance entirely.

Option B was chosen because **the real floor workflow wasn't fully known yet** at decision time — how strictly staff actually clock in/out day to day was an open question. Option B is the safer default specifically because it can have Option A's clock-in accountability *layered on top* later (e.g., "you can't clock out with unreported activity" — which we did add, see §6) without ripping anything out. Option A baked in as the *only* model would have been much harder to walk back if it turned out clock-in/out discipline wasn't reliable enough to hang cash reconciliation on.

### "How do you prevent double-counting?"

By construction: an order only ever falls into the shift-window of *one* handover, because the window is defined by a strict `createdAt > lastHandoverTimestamp` comparison against a single staff member's own most recent submission. Once a handover is submitted, its timestamp becomes the new floor — anything reported in it can never appear in a later window for that same person. This was verified empirically, not just by code review: two sequential handovers were submitted for the same staff member in a real browser session, and the second handover's totals were confirmed to only include orders created *after* the first submission.

### "What happens with simultaneous staff?"

Each shift window is scoped per `staffName`, so two staff members working concurrently never see each other's orders in their own handover — verified the same way, with two separate staff sessions creating orders in parallel and confirming each handover only showed its own staff member's activity.

### "How does this scale to a real backend?"

The same query translates directly: `SELECT * FROM orders WHERE staff_id = ? AND created_at > (SELECT MAX(timestamp) FROM shift_handovers WHERE staff_id = ?)`. Nothing about this model is localStorage-specific — it's a timestamp comparison against a foreign-keyed staff ID, which is exactly the shape a real database handles well (and better — with actual query performance instead of filtering an array client-side).

### Revenue totals: Paid, not Cancelled, only

Separately from shift scoping, every revenue total in the app (Dashboard's "Today's Sales," Shift Handover's expected cash, Admin's "Total Cash Today," the Drop-off Summary) now only counts orders where `payStatus === "Paid"` and `status !== "Cancelled"`. An UnPaid order hasn't put money in the drawer yet; a Cancelled order never happened. Counting either would overstate cash that isn't actually there. This rule lives in `computeStatsFromOrders()` (`localOrders.ts`) and is reused by every page that shows a revenue figure — nobody computes their own separate version of "sales."

### Dashboard "Today's Sales" is intentionally NOT shift-scoped (design decision)

Worth calling out explicitly, because it's easy to mistake for an inconsistency: Dashboard's "Today's Sales" (Staff and Admin) is a **whole-day total** — every Paid, non-Cancelled order for the day, regardless of who's submitted a handover or when. It does **not** reset or shrink when someone submits a Shift Handover.

This is deliberate, not a leftover bug. Dashboard and Shift Handover are answering two different questions:
- **Dashboard** — "how did the shop do today?" (an owner/manager question — total activity, whoever handled it, whether or not it's been reconciled yet)
- **Shift Handover** — "what have I personally not reported yet?" (a staff-accountability question — must exclude anything already reconciled, or it would double-count)

If Dashboard were shift-scoped too, submitting a handover partway through the day would make "Today's Sales" *drop*, which would look broken to anyone watching it — the shop didn't sell less, a staff member just reconciled their drawer. Keeping Dashboard as an unscoped whole-day figure and Shift Handover as a per-staff "unreported since last submission" figure means both numbers stay individually correct and never appear to contradict each other once you know what each one is answering. **If a review panel asks "why doesn't the dashboard reset after a handover?" — this is why: it isn't supposed to.** Both use the same underlying "Paid, not Cancelled" revenue rule (`computeStatsFromOrders` in `localOrders.ts`); Dashboard simply doesn't apply the additional shift-window filter on top of it that Shift Handover does.

### Starting cash: one shared drawer, not per-staff (RESOLVED)

This was the one open decision left after the first fix pass, now closed. `CASH_DRAWER_START` used to be a hardcoded ₱5000 for every handover, for every staff member, forever. That's wrong for a real laundry shop: there is **one physical cash drawer**, and whoever closes out a shift hands the drawer — with whatever is actually in it — to whoever opens the next one. The starting float for a new handover has to be *whatever the previous person actually counted*, not a fixed number and not "whatever I personally counted last time" (staff members don't each have their own private drawer).

So `getCashDrawerStart()` (`localShiftHandover.ts`) looks at **every** submitted `ShiftHandoverRecord`, across all staff, and returns the `actualCashCounted` of whichever one has the most recent timestamp — deliberately *not* scoped to the current staff member, unlike the shift-order-scoping rule above. If no handover has ever been submitted at all (the very first one in the system's history), it falls back to ₱5000 as a sensible seed value — there's nothing real to carry forward yet, so a fixed starting float is the only option, same reasoning as the original placeholder.

**Verified empirically, exactly like the double-counting check:** Alice submitted a handover counting ₱7,350 in the drawer. Bob then opened a new handover and its starting Cash Drawer figure showed ₱7,350 — not the ₱5,000 fallback, and not any number from Bob's own (nonexistent) history. Bob then submitted counting ₱6,100, and Alice's *next* handover picked up ₱6,100 — confirming the rule tracks whoever closed out most recently, not just "the other person," across a three-handover chain (Alice → Bob → Alice).

---

## 4. What Changed — Before / After

| # | Area | Before | After |
|---|------|--------|-------|
| 1 | Shift Handover scoping | Showed every order/expense ever created, by anyone | Shows only this staff member's activity since their own last submitted handover (Option B) |
| 2 | Revenue totals | Counted UnPaid orders as sales | Only Paid, non-Cancelled orders count as revenue — applied consistently across Dashboard, Admin Sales, and Shift Handover |
| 3 | Inventory | Selling an order never touched stock levels | Real deduction on order creation (packages consume detergent/downy; supplies deduct 1:1) |
| 4 | Order cancellation | No way to cancel/void an order at all | Staff can cancel Pending/In Progress/Ready orders (not Claimed); stock is automatically restored; a confirmation modal guards the action |
| 5 | Double-counting (re-check) | N/A (new capability) | Re-verified after the revenue-filter change layered on top of shift scoping — the two filters are independent and don't interact, confirmed by inspection and by the original two-staff/two-handover empirical test still holding |
| 6 | Form double-submit | Clicking "Finish Transaction" / "Submit Expense" / "Submit records" twice quickly could create duplicate records | All three forms now use a synchronous re-entrancy lock (a ref, not just state — state alone doesn't reliably block a same-tick double click) and show "Processing…" while locked |
| 7 | Sales table | No visibility into whether an order was actually paid | Added a Payment column (Paid/UnPaid badge) next to order status |
| 8 | Attendance elapsed time | A forgotten clock-out accumulated hours indefinitely, bleeding into the next day with no cap | Sessions auto-close after 16 hours, flagged `autoClosed: true`, visible to both Staff and Admin, original clock-in date preserved |
| 9 | Clock-out safety | Staff could clock out with unreported orders/expenses sitting unrecorded | Clock-out is fully blocked (not just warned) if unreported activity exists since the last handover, with a modal directing them to Shift Handover first |
| 10 | Starting cash drawer | Hardcoded ₱5000 for every handover, every staff member, forever | Carries forward from the single most recently submitted handover (any staff member) — one shared physical drawer, tracked correctly regardless of who used it last; ₱5000 only as the very-first-handover-ever fallback |
| 11 | Payment method | Captured in the checkout UI, then silently discarded — never saved to the order | Persisted on `Order`; shown in Sales table; GCash sales excluded from Shift Handover's physical cash count and shown separately instead |
| 12 | "Other sales" bucket | Custom per-kg services and raw supplies lumped into one unlabeled figure | Split into distinct Supply Sales and Custom Service Sales, matched positively against known supplies rather than guessed by leftover math |
| 13 | Package sales breakdown | Existed on Admin Sales only | Also added to Staff Sales, reusing the existing `getDropOffSummary()` — no new logic |
| 14 | Sales date filtering | Free-text substring match against a display-formatted date string | Real From/To date range plus quick presets, filtering on `Order.createdAt` |
| 15 | Average order value | Not calculated anywhere | Added to both Staff and Admin Sales, using the same revenue rule as every other sales figure |

---

## 5. Attendance Auto-Close (forgotten clock-out)

**Problem:** `todayShiftHours` was computed live as `now − timeIn` with no ceiling. A staff member who forgot to clock out would show a growing, unbounded hour count — even across a day boundary — which is what the client reported as confusing.

**Fix:** `getStoredAttendance()` now sweeps for stale open records on every read (`localAttendance.ts`). Any record still clocked in past **16 hours** (a realistic ceiling for one shift, even a long one) gets closed automatically:
- `timeOut` is set to *clock-in time + 16h* (the threshold point), not "now" — so the record doesn't silently absorb however long it's actually been forgotten.
- `totalHours` is capped at 16.
- `autoClosed: true` is set and shown as a distinct "Auto-closed" badge, next to (not replacing) the normal status badge, on both the Staff and Admin Attendance tables — nothing is hidden, so Admin can manually correct hours for payroll.
- The original clock-in `date` is untouched, so a session that started the previous day still shows that day, not "today."

**Why 16 hours specifically:** it's comfortably above any legitimate single or double shift for a small laundry shop, while still being tight enough to catch a genuinely forgotten clock-out well before it becomes a payroll headache. It's a judgment call, not a client-specified number — easy to change in one place (`MAX_SESSION_HOURS` in `localAttendance.ts`) if the real number turns out to be different.

**Tested empirically:** a stale record was seeded directly into storage with a clock-in 20 hours in the past, spanning a real day boundary. Loading the Attendance page triggered the sweep; the record closed at exactly the 16-hour mark, kept its original date, and displayed the Auto-closed badge correctly on both Staff and Admin views.

---

## 6. Clock-Out Guard (unreported activity)

**Problem:** nothing stopped a staff member from clocking out while orders or expenses sat unreported — money that would never make it into a shift handover unless someone happened to notice.

**Fix:** clocking out now calls the same "unreported since last handover" check Shift Handover itself uses (`getUnreportedActivity`, `localShiftHandover.ts`). If anything is unreported, clock-out is **fully blocked** — a modal explains what's outstanding and offers "Go to Shift Handover" or "Cancel." There is no "proceed anyway" option; given this directly affects cash accountability, a soft, dismissable warning wasn't considered safe enough.

**Tested empirically:** clock-out was attempted with one unreported order — blocked, record confirmed still open in storage. "Cancel" was tested — record stayed open, no side effect. "Go to Shift Handover" was tested — navigated correctly. The handover was then submitted, and clock-out was attempted again — it succeeded immediately, confirming the guard clears once activity is actually reported.

---

## 7. Sales Page Enhancements (payment method, breakdowns, date range, average order value)

Follow-up work after a gap analysis compared the Sales pages against what a real Philippine laundry/wash-and-refill shop typically expects. Five gaps were closed; a sixth (customer repeat-visit history) was deliberately deferred as a real scope decision, not a quick add — see Known Limitations.

**Payment method (Cash/GCash) — data-model fix.** The checkout screen already had a Cash/GCash dropdown, but it was pure UI state — `Order` had nowhere to store it, so the selection was captured and then silently discarded every time. `Order.paymentMethod` (`types.ts`) now persists it, and it flows through to two places that actually needed it:
- **Sales table** — shows "Paid · Cash" / "Paid · GCash" next to each order.
- **Shift Handover's cash math** — this is the part that actually matters. GCash payments never put physical cash in the drawer, so `expectedCash` now sums **only Cash-method sales** (`cashSalesTotal` in `shifthandover/page.tsx`), while GCash revenue is shown separately as "GCash / digital (excluded above)" so it's visible, not just missing. Orders from before this field existed are treated as Cash — matching how everything was already implicitly counted before this fix, so no historical order silently drops out of the cash count.
- Verified empirically: one Cash order (₱199) and one GCash order (₱219) were created through the real checkout flow. Shift Handover's Expected Cash came out to drawer-start + ₱199 only, with the ₱219 GCash amount shown separately, not folded into the cash figure.

**Custom service sales split from supply sales.** Previously, everything that wasn't a recognized package got lumped into one "Other sales" figure — raw supplies (Fabcon, Bleach…) and custom per-kg services (rugs, carpets, bulk items) were indistinguishable. Shift Handover now computes `supplySales` by positively matching known supply items (same name/×N-suffix matching already used for packages), and treats whatever revenue is left over as `customServiceSales` — since custom services don't have a fixed catalog price to match against, but everything that *isn't* a package or a known supply, by elimination, is one. Verified with a 3-item mix (one package, one supply, one custom service): the ₱30 supply and ₱100 custom-service portions came out exactly right, not blended together.

**Package Sales Breakdown — Staff Sales page.** Admin already had this (Drop-off Summary); Staff's Sales page didn't. Now reuses the existing `getDropOffSummary()` (`lib/localStats.ts`) — no new aggregation logic, just wired onto a page that didn't have it. Respects whatever status/date filters are currently applied.

**Date-range filtering.** The old "Search Date" field was free-text substring matching against a locale date string — imprecise and easy to get wrong. Replaced with real From/To date inputs plus Today / Last 7 Days / Last 30 Days / All quick presets, filtering on `Order.createdAt` (a real timestamp, not a display string). Orders from before `createdAt` existed are excluded once a range is active (can't be reliably placed in it), same rule used elsewhere for time-based filtering. Verified: setting the range to a date with no orders in it correctly emptied the table, the average order value, and the package breakdown together — confirming the filter drives every dependent figure, not just the visible rows.

**Average order value.** Wasn't calculated anywhere. Added `getAverageOrderValue()` (`lib/localStats.ts`) — same "Paid, not Cancelled" rule as every other revenue figure in the app — and surfaced it on both Staff Sales (respecting the active filters) and Admin Sales (all-time, matching "Total Cash Today"'s existing scope).

---

## 8. Known Remaining Limitations

Documented deliberately rather than hidden — these are real gaps, not oversights:

- **Duplicate "Liquid Detergent" inventory row.** Two inventory items share the same name (Sachet-tracked vs Liters-tracked). The deduction logic disambiguates correctly today by matching on `(name, unit)`, but this is fragile seed data — a real backend should give these distinct names/SKUs.
- **No stock-floor protection.** Selling more than what's in stock is allowed and will drive `currentStock` negative rather than being blocked. This is intentional for now (a negative number is honest information about a shortfall, not something to hide) but a real POS may want an explicit low-stock/oversell warning at the point of sale.
- **Withdrawals aren't reflected in Shift Handover's cash math.** Admin's withdrawal feature is tracked separately and explicitly labeled "Demo only" — it doesn't feed into Staff's expected-cash calculation yet.
- **No real-time sync across staff/admin sessions.** Since this is `localStorage`-backed, two browser tabs/devices don't see each other's changes live — this is an accepted limitation of the pre-backend architecture, not a bug.
- **Per-kg custom laundry services don't deduct raw materials.** Only packaged services (Basic/Double/Ultra/Legendary) and directly-sold supplies affect inventory. Custom services have no defined material cost yet.
- **Cancelled orders are excluded from the four Service-status buckets** (Pending/In Progress/Ready/Claimed) rather than getting a fifth count card — visible via their own filter tab, but not summarized in a stat card. Low-priority polish, not a correctness issue.
- **No GCash reference-number field.** PH shops typically jot down a GCash transaction reference for dispute/reconciliation purposes; the app tracks that a sale was GCash, but not which specific reference it corresponds to. Deferred — not part of the original gap list's five approved items.
- **No customer repeat-visit tracking.** `Order.customer`/`Order.contact` are free-text with no customer entity behind them — there's no way to see "is this a repeat customer" or build any loyalty/history view. Deliberately **not** built in this pass: this is a real scope decision (does the client even want this, and how much) rather than something to bolt on under deadline pressure. Flagged for a deliberate future conversation, not treated as an oversight.
- **Per-kg custom laundry services still don't deduct raw materials from inventory.** Their *revenue* is now correctly split out (see §7), but `applyOrderStockImpact` (inventory deduction) still only understands packages and known supplies — custom services have no defined material cost, so no inventory line moves when one is sold. This is a different gap from the revenue-reporting one closed in §7; deferred for the same reason as the original audit note.

---

## 9. Where to Look in the Code

| Concept | File |
|---|---|
| Shift scoping / unreported-activity rule | `app/staff/(dashboard)/localShiftHandover.ts` |
| Shared cash drawer carry-forward | `app/staff/(dashboard)/localShiftHandover.ts` (`getCashDrawerStart`) |
| Revenue filtering (Paid, not Cancelled) | `app/staff/(dashboard)/localOrders.ts` (`computeStatsFromOrders`), `app/lib/localStats.ts` (`getDropOffSummary`) |
| Inventory deduction/restoration | `app/staff/(dashboard)/localInventory.ts` (`applyOrderStockImpact`) |
| Order cancellation | `app/staff/(dashboard)/localOrders.ts` (`cancelOrder`) |
| Attendance auto-close | `app/staff/(dashboard)/localAttendance.ts` |
| Clock-out guard UI | `app/staff/(dashboard)/attendance/page.tsx` |
| Payment method + cash/digital split | `app/staff/(dashboard)/types.ts` (`Order.paymentMethod`), `app/staff/(dashboard)/shifthandover/page.tsx` |
| Supply vs. custom-service sales split | `app/staff/(dashboard)/shifthandover/page.tsx` |
| Average order value | `app/lib/localStats.ts` (`getAverageOrderValue`) |
| Sales date-range filtering | `app/components/staffcom/sales/SalesFilters.tsx`, `app/staff/(dashboard)/sales/page.tsx` |
