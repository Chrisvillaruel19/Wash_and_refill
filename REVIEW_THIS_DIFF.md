# Review: 26 Uncommitted Files

This file organizes the current uncommitted working-tree changes into 5 logical review groups, matching how you'd likely want to commit them. **Nothing has been committed or pushed** — this file is purely for your review. Every one of the 26 changed files appears in exactly one group below (two files that mix concerns are flagged explicitly rather than silently split).

---

## Group 1 — Security Fixes

**What was broken:** Two real security gaps in the login/session system. First, logging in with a username that doesn't exist responded instantly, while logging in with a real username but the wrong password took noticeably longer (because it runs a slow, intentional password-hashing check). That timing difference lets an attacker quietly discover which usernames are real accounts just by measuring response speed, without ever guessing a password. Second, if a "refresh token" (the long-lived credential that keeps someone logged in for a week without re-entering their password) were ever stolen and used by both the attacker and the real user, the system had no way to notice — it just silently rejected whichever one showed up second, with no alarm raised.

**What changed:** (1) Login now does the same slow hashing work even when the username doesn't exist, so both cases take the same amount of time and reveal nothing. (2) If a refresh token that's already been used shows up again, the system now treats that as a sign of theft and immediately invalidates every other active session for that account, forcing a fresh login everywhere.

**Why it matters:** These are the kind of gaps a real attacker (not just a curious user) could exploit against a live, internet-facing app. Fixing them costs nothing in normal day-to-day use — staff and admins will never notice a difference — but closes two real doors.

**Files touched:**
- `backend/src/services/auth/login.service.ts`
- `backend/src/services/auth/refresh-token.service.ts`
- `backend/src/repositories/token.repository.ts`

**Diff:**

```diff
diff --git a/backend/src/repositories/token.repository.ts b/backend/src/repositories/token.repository.ts
index 7c0c88f..a16c46c 100644
--- a/backend/src/repositories/token.repository.ts
+++ b/backend/src/repositories/token.repository.ts
@@ -60,10 +60,36 @@ export class TokenRepository {
         type: TokenType.REFRESH,
         consumedAt: null,
         revokedAt: null,
+        // Belt-and-suspenders alongside the JWT's own exp claim (already
+        // checked by verifyRefreshToken before this is ever called) — keeps
+        // this query correct on its own if the two ever diverge.
+        expiresAt: { gt: new Date() },
       },
     });
   }
 
+  // Reuse-detection lookup: finds the row regardless of consumed/revoked/
+  // expired state, so a caller can tell "never existed" apart from "existed
+  // but was already consumed" (a signal of token theft/replay — a valid
+  // refresh token should only ever be presented once, since it's rotated
+  // away immediately on use).
+  async findRefreshTokenByRawValue(token: string): Promise<Token | null> {
+    return prisma.token.findFirst({
+      where: { token: hashToken(token), type: TokenType.REFRESH },
+    });
+  }
+
+  // Reuse-detection response: revoke every other still-active refresh token
+  // for this user, forcing re-login everywhere. Session hijacking succeeds
+  // (in the worst case) only until the legitimate device's next refresh
+  // attempt collides with the attacker's already-consumed token.
+  async revokeAllActiveRefreshTokensForUser(userId: string, tx: PrismaClientOrTx = prisma) {
+    return tx.token.updateMany({
+      where: { userId, type: TokenType.REFRESH, consumedAt: null, revokedAt: null },
+      data: { revokedAt: new Date() },
+    });
+  }
+
 
 
 async findActiveResetToken(token: string): Promise<Token | null> {
diff --git a/backend/src/services/auth/login.service.ts b/backend/src/services/auth/login.service.ts
index 477d4a2..6eee22c 100644
--- a/backend/src/services/auth/login.service.ts
+++ b/backend/src/services/auth/login.service.ts
@@ -10,6 +10,14 @@ import {
 const userRepository = new UserRepository();
 const tokenRepository = new TokenRepository();
 
+// A syntactically valid (but unusable — no real user has this salt/hash)
+// PBKDF2 record, used only to make the "unknown username" path pay the same
+// pbkdf2 cost as the "wrong password" path below. Without this, an attacker
+// measuring response latency could distinguish the two cases (fast return
+// vs. a ~120,000-iteration derivation) and enumerate valid usernames.
+const DUMMY_PASSWORD_HASH =
+  "0000000000000000000000000000000000000000000000000000000000000000:120000:" +
+  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
 
 export async function LoginService(
   username: string,
@@ -21,6 +29,8 @@ export async function LoginService(
     const user = await userRepository.findByUsername(username);
 
     if (!user) {
+      // Still pay the pbkdf2 cost — see DUMMY_PASSWORD_HASH above.
+      verifyPassword(password, DUMMY_PASSWORD_HASH);
       return {
         code: 401,
         status: "error",
diff --git a/backend/src/services/auth/refresh-token.service.ts b/backend/src/services/auth/refresh-token.service.ts
index 88b3031..478cf32 100644
--- a/backend/src/services/auth/refresh-token.service.ts
+++ b/backend/src/services/auth/refresh-token.service.ts
@@ -15,6 +15,17 @@ export async function RefreshTokenService(refreshToken: string) {
 
     const storedToken = await tokenRepository.findActiveRefreshToken(refreshToken);
     if (!storedToken) {
+      // Distinguish "never existed" from "existed but was already consumed
+      // or revoked" — a legitimate refresh token is rotated away the
+      // instant it's used, so it should only ever be presented once. Seeing
+      // it again is a signal the token was stolen and both the attacker and
+      // the legitimate holder are now racing to use it. Response: revoke
+      // every other active refresh token for this user, forcing every
+      // session (attacker included) to re-authenticate.
+      const raw = await tokenRepository.findRefreshTokenByRawValue(refreshToken);
+      if (raw && (raw.consumedAt !== null || raw.revokedAt !== null)) {
+        await tokenRepository.revokeAllActiveRefreshTokensForUser(raw.userId);
+      }
       return { code: 401, status: "error", message: "Invalid or expired refresh token" };
     }
 
```

---

## Group 2 — Order Lifecycle Bug Fixes

**Note on scope:** you listed "Order ownership restriction (Staff own-only, Admin any)" as part of this group. I checked — that feature (the `canModifyOrder` check used by both files below) is **already committed** in your git history (commit `506319f`), not part of these 26 uncommitted files. It's real and working, just not something sitting in this diff to review. What *is* uncommitted here are two further correctness fixes layered on top of that existing ownership system.

**What was broken:** (1) An order could be marked "Claimed" (picked up by the customer) even if it had never actually been marked as paid — meaning laundry could leave the shop with no payment ever recorded, and nothing later would catch that. (2) Once an order had already been swept into a submitted Shift Handover (the cash-reconciliation record for a shift), it could still be cancelled afterward — which would restore its inventory and change its status, while the already-closed handover's totals kept silently counting the cancelled order as if nothing happened.

**What changed:** (1) An order now cannot be moved to "Claimed" unless its payment status is PAID — trying to do so is rejected with a clear message asking staff to mark it paid first. (2) Cancelling an order that's already part of a submitted Shift Handover is now rejected, since undoing it at that point would corrupt a financial record that's supposed to be frozen.

**Why it matters:** Both are real money-handling gaps for a laundry business — the first could mean giving away paid work for free, the second could silently make a shift's cash reconciliation wrong after the fact.

**Files touched:**
- `backend/src/services/order/update-order-status.service.ts`
- `backend/src/services/order/cancel-order.service.ts`

**Diff:**

```diff
diff --git a/backend/src/services/order/cancel-order.service.ts b/backend/src/services/order/cancel-order.service.ts
index 85c133f..99a6b77 100644
--- a/backend/src/services/order/cancel-order.service.ts
+++ b/backend/src/services/order/cancel-order.service.ts
@@ -32,6 +32,22 @@ export async function cancelOrderService(userId: string, id: string, actorRole?:
         };
       }
 
+      // A paid order becomes claimable into a Shift Handover as soon as it's
+      // PAID and non-CANCELLED (see lockUnclaimedPaidIds) — independent of
+      // its own status, so a PENDING/IN_PROGRESS/READY order can already be
+      // sitting inside an already-submitted (and thus frozen-total) handover
+      // by the time someone tries to cancel it here. Same reasoning as
+      // reverse-order-payment.service.ts and update-expense.service.ts:
+      // cancelling now would restore inventory and change the order's status
+      // while the closed handover's revenue total silently keeps counting it.
+      if (existing.shiftHandoverId !== null) {
+        return {
+          alreadyClaimed: true as const,
+          message:
+            "This order has already been reconciled in a Shift Handover and can no longer be cancelled.",
+        };
+      }
+
       // Restore whatever this order actually consumed. The original
       // InventoryConsumption rows are left exactly as they are — they
       // remain a true historical record of what this order consumed before
@@ -67,6 +83,9 @@ export async function cancelOrderService(userId: string, id: string, actorRole?:
     if ("notCancellable" in result) {
       return { code: 400, status: "error", message: result.message };
     }
+    if ("alreadyClaimed" in result) {
+      return { code: 409, status: "error", message: result.message };
+    }
 
     return {
       code: 200,
diff --git a/backend/src/services/order/update-order-status.service.ts b/backend/src/services/order/update-order-status.service.ts
index f65dd02..815a21b 100644
--- a/backend/src/services/order/update-order-status.service.ts
+++ b/backend/src/services/order/update-order-status.service.ts
@@ -1,7 +1,7 @@
 import { prisma } from "../../lib/prisma.js";
 import { OrderRepository } from "../../repositories/order.repository.js";
 import { isValidStatusTransition, canModifyOrder } from "./order-status-flow.util.js";
-import { OrderStatus, AuditAction, Role } from "../../../generated/prisma/client.js";
+import { OrderStatus, PaymentStatus, AuditAction, Role } from "../../../generated/prisma/client.js";
 import { writeAuditLog } from "../../lib/audit-log.js";
 
 const orderRepository = new OrderRepository();
@@ -31,6 +31,20 @@ export async function updateOrderStatusService(
         };
       }
 
+      // A customer picking up their laundry (CLAIMED) must have actually
+      // paid for it — "Claimed" without "Paid" would mean goods left the
+      // shop with no payment ever recorded, and there's no gate anywhere
+      // else in the order lifecycle that would catch that later. Mirrors
+      // Shift Handover's own definition of a claimable order
+      // (lockUnclaimedPaidIds requires paymentStatus = PAID) — the two
+      // "claim" concepts share a name and should share this rule.
+      if (targetStatus === OrderStatus.CLAIMED && existing.paymentStatus !== PaymentStatus.PAID) {
+        return {
+          invalidTransition: true as const,
+          message: "This order must be marked as paid before it can be claimed.",
+        };
+      }
+
       const extra = targetStatus === OrderStatus.CLAIMED ? { claimedDate: new Date() } : {};
       const updated = await orderRepository.updateStatus(id, targetStatus, extra, tx);
 
```

---

## Group 3 — Dashboard/Reporting Fix

**What was broken:** This is the exact bug you asked about — the Staff Dashboard's "Claimed today" number was never actually filtered by date. It was silently counting *every order ever claimed, across all time*, and just labeling that number "today." So on a day with zero real claims, it would still show the all-time total (e.g. "13"), while "Today's Sales" (which *was* correctly date-filtered) correctly showed ₱0. The two numbers looked contradictory because one was lying about being "today."

**What changed:** "Claimed today" now uses a new, correctly date-scoped database query that only counts orders whose actual claim timestamp (`claimedDate`) falls within today's real business day (Asia/Manila time, matching how "Today's Sales" already worked). Verified live: before any claim, it correctly shows 0; after claiming exactly one order, it shows exactly 1 — not the all-time total.

**A note on a file that's split across two groups:** `backend/src/repositories/order.repository.ts` contains the new query this fix needs (`countClaimedInRange`, shown below), but that same file *also* has an unrelated deletion (an old analytics-only query being removed). To avoid showing the same file's diff twice, the full file diff for `order.repository.ts` is shown once, in Group 4 below, since most of its changes belong there. The new addition relevant to *this* fix is reproduced here on its own for clarity.

**Files touched:**
- `backend/src/services/dashboard/get-staff-dashboard.service.ts`
- `backend/src/repositories/order.repository.ts` *(shared with Group 4 — see note above; full diff shown in Group 4)*

**Diff — `get-staff-dashboard.service.ts` (full file):**

```diff
diff --git a/backend/src/services/dashboard/get-staff-dashboard.service.ts b/backend/src/services/dashboard/get-staff-dashboard.service.ts
index 461c5d8..2a6c518 100644
--- a/backend/src/services/dashboard/get-staff-dashboard.service.ts
+++ b/backend/src/services/dashboard/get-staff-dashboard.service.ts
@@ -11,8 +11,9 @@ const orderRepository = new OrderRepository();
 export async function getStaffDashboardService() {
   try {
     const todayRange = getBusinessDayRange();
-    const [todaysSales, statusCounts, lowStockResult] = await Promise.all([
+    const [todaysSales, claimedToday, statusCounts, lowStockResult] = await Promise.all([
       orderRepository.sumPaidRevenue(todayRange),
+      orderRepository.countClaimedInRange(todayRange),
       orderRepository.countByStatus(),
       lowStockInventoryService(),
     ]);
@@ -23,7 +24,7 @@ export async function getStaffDashboardService() {
       message: "Staff dashboard statistics retrieved successfully",
       data: {
         todaysSales,
-        claimedToday: statusCounts.CLAIMED,
+        claimedToday,
         ready: statusCounts.READY,
         lowStockItems: lowStockResult.data?.items ?? [],
       },
```

**Diff — just the new addition inside `order.repository.ts` (the rest of that file's diff is in Group 4):**

```diff
diff --git a/backend/src/repositories/order.repository.ts b/backend/src/repositories/order.repository.ts
+  // Dashboard: how many orders were actually claimed within a date range
+  // (Staff Dashboard's "Claimed today" card) — scoped by claimedDate, the
+  // timestamp update-order-status.service.ts sets at the exact moment an
+  // order transitions to CLAIMED. Distinct from countByStatus().CLAIMED
+  // below, which is an all-time, unscoped count of every order currently
+  // sitting in CLAIMED status regardless of when that happened — that
+  // figure was previously (incorrectly) reused for "today," which meant a
+  // laundry business with zero claims today still saw yesterday's (or last
+  // month's) total displayed as "Claimed today."
+  async countClaimedInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma): Promise<number> {
+    return tx.order.count({
+      where: { status: OrderStatus.CLAIMED, claimedDate: { gte: range.start, lt: range.end } },
+    });
+  }
```

---

## Group 4 — Analytics Module Removal

**What this is:** A full "business analytics" feature (revenue trend charts, category/staff breakdowns, cash-vs-GCash charts, a "Simplified Profit" figure) was built earlier — a backend API plus a full Admin dashboard page — but on review this was judged premature: it wasn't something the current client workflow actually needed yet, and it risked drifting out of sync with the real transactional numbers (Orders/Shift Handover) if left half-maintained. Rather than leave unused code sitting in the app, it's been removed cleanly, end to end.

**What changed:** Every analytics-only file was deleted outright (controller, routes, schemas, 8 service files, the frontend Analytics page, the frontend API client for it, and the sidebar link to it). Two shared repository files (`order.repository.ts`, `expense.repository.ts`) had one query each removed because that query existed *only* to feed analytics and nothing else in the app ever called it.

**What did NOT change, and how I know:** the core Shift Handover cash-reconciliation logic (`reconciliation.util.ts`, the file analytics only ever *read from*) has **zero diff** — confirmed directly with `git diff` before writing this file. Analytics never modified that logic, so removing analytics couldn't have touched it.

**Why it matters:** Removes ~975 lines of unused surface area (less to secure, less to keep correct, less for a future developer to wonder "is this still used?"). No functionality any current screen depends on was removed — the deleted Admin `/admin/analytics` page was the *only* consumer of all the deleted backend code.

**Files touched (18 files):**
- `backend/src/controllers/analytics.controller.ts` *(deleted)*
- `backend/src/routes/analytics.routes.ts` *(deleted)*
- `backend/src/routes/index.ts` *(modified — removes the route registration)*
- `backend/src/schema/analytics/date-range-with-grouping.schema.ts` *(deleted)*
- `backend/src/schema/analytics/date-range.schema.ts` *(deleted)*
- `backend/src/schema/analytics/index.ts` *(deleted)*
- `backend/src/services/analytics/cash-vs-gcash.service.ts` *(deleted)*
- `backend/src/services/analytics/expense-analytics.service.ts` *(deleted)*
- `backend/src/services/analytics/index.ts` *(deleted)*
- `backend/src/services/analytics/order-summary.util.ts` *(deleted)*
- `backend/src/services/analytics/period-bucket.util.ts` *(deleted)*
- `backend/src/services/analytics/revenue-by-category.service.ts` *(deleted)*
- `backend/src/services/analytics/revenue-by-staff.service.ts` *(deleted)*
- `backend/src/services/analytics/revenue-trend.service.ts` *(deleted)*
- `backend/src/services/analytics/simplified-profit.service.ts` *(deleted)*
- `frontend/app/admin/(dashboard)/analytics/page.tsx` *(deleted)*
- `frontend/app/lib/services/analyticsApi.service.ts` *(deleted)*
- `frontend/app/components/admincom/AdminSidebar.tsx` *(modified — removes the nav link)*

**Plus 2 files shared with other groups, included here in full since most of their diff belongs here:**
- `backend/src/repositories/expense.repository.ts` *(modified — this one is 100% analytics-only: removes a single unused query, nothing else)*
- `backend/src/repositories/order.repository.ts` *(modified — mostly an analytics-only query removal, but **also contains the Group 3 dashboard fix addition** shown separately above; shown here in full so you see the complete real diff)*

**Diff — `routes/index.ts` and `AdminSidebar.tsx` (small, clean removals):**

```diff
diff --git a/backend/src/routes/index.ts b/backend/src/routes/index.ts
index ef7a4a2..1ef3541 100644
--- a/backend/src/routes/index.ts
+++ b/backend/src/routes/index.ts
@@ -13,7 +13,6 @@ import shiftHandoverRoutes from "./shift-handover.routes.js";
 import withdrawalRoutes from "./withdrawal.routes.js";
 import dashboardRoutes from "./dashboard.routes.js";
 import auditLogRoutes from "./audit-log.routes.js";
-import analyticsRoutes from "./analytics.routes.js";
 
 const router = Router();
 
@@ -40,7 +39,6 @@ router.use("/shift-handover", shiftHandoverRoutes);
 router.use("/withdrawals", withdrawalRoutes);
 router.use("/dashboard", dashboardRoutes);
 router.use("/audit-logs", auditLogRoutes);
-router.use("/analytics", analyticsRoutes);
 
 
 export default router;
\ No newline at end of file
diff --git a/frontend/app/components/admincom/AdminSidebar.tsx b/frontend/app/components/admincom/AdminSidebar.tsx
index 6ff7653..73338ca 100644
--- a/frontend/app/components/admincom/AdminSidebar.tsx
+++ b/frontend/app/components/admincom/AdminSidebar.tsx
@@ -19,7 +19,6 @@ import {
   LogOut,
   Menu,
   X,
-  BarChart3,
 } from "lucide-react";
 
 import { logout } from "../../lib/auth";
@@ -35,7 +34,6 @@ const menuItems = [
   { label: "Sales", href: "/admin/sales", icon: DollarSign },
   { label: "Expenses", href: "/admin/expenses", icon: Receipt },
   { label: "Attendance", href: "/admin/attendance", icon: CalendarDays },
-  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
 ];
 
 export default function AdminSidebar() {
```

**Diff — `expense.repository.ts` and `order.repository.ts` (full files, shared with Group 3 — see note above):**

```diff
diff --git a/backend/src/repositories/expense.repository.ts b/backend/src/repositories/expense.repository.ts
index fda7c8c..278930e 100644
--- a/backend/src/repositories/expense.repository.ts
+++ b/backend/src/repositories/expense.repository.ts
@@ -105,15 +105,4 @@ export class ExpenseRepository {
     return tx.expense.findMany({ where: { userId, shiftHandoverId: null } });
   }
 
-  // Analytics source: every expense whose expenseDate falls in [start, end)
-  // — global (all staff), joined with the submitting user for per-staff
-  // breakdowns. Independent of shiftHandoverId/claim status, same reasoning
-  // as OrderRepository.findPaidInRange — an expense counts for the period
-  // it happened in regardless of whether it's been reconciled yet.
-  async findInRange(start: Date, end: Date, tx: PrismaClientOrTx = prisma) {
-    return tx.expense.findMany({
-      where: { expenseDate: { gte: start, lt: end } },
-      include: { user: { select: { id: true, name: true } } },
-    });
-  }
 }
diff --git a/backend/src/repositories/order.repository.ts b/backend/src/repositories/order.repository.ts
index 70c57ec..5163ad5 100644
--- a/backend/src/repositories/order.repository.ts
+++ b/backend/src/repositories/order.repository.ts
@@ -205,6 +205,21 @@ export class OrderRepository {
     });
   }
 
+  // Dashboard: how many orders were actually claimed within a date range
+  // (Staff Dashboard's "Claimed today" card) — scoped by claimedDate, the
+  // timestamp update-order-status.service.ts sets at the exact moment an
+  // order transitions to CLAIMED. Distinct from countByStatus().CLAIMED
+  // below, which is an all-time, unscoped count of every order currently
+  // sitting in CLAIMED status regardless of when that happened — that
+  // figure was previously (incorrectly) reused for "today," which meant a
+  // laundry business with zero claims today still saw yesterday's (or last
+  // month's) total displayed as "Claimed today."
+  async countClaimedInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma): Promise<number> {
+    return tx.order.count({
+      where: { status: OrderStatus.CLAIMED, claimedDate: { gte: range.start, lt: range.end } },
+    });
+  }
+
   // Dashboard: total revenue from every paid, non-cancelled order — now
   // date-scoped via paymentDate when a range is passed (both dashboard
   // services pass getBusinessDayRange() for "today"). Range omitted =
@@ -226,23 +241,6 @@ export class OrderRepository {
     return Number(result._sum.totalAmount ?? 0);
   }
 
-  // Analytics source: every paid, non-cancelled order whose paymentDate
-  // falls in [start, end) — same shape as findUnclaimedPaid (orderDetails
-  // included) plus the owning staff member, so callers can feed this
-  // straight into summarizeOrders (reconciliation.util.ts) for the
-  // category/cash-vs-gcash breakdown, or group by user for per-staff
-  // revenue, without a second query.
-  async findPaidInRange(start: Date, end: Date, tx: PrismaClientOrTx = prisma) {
-    return tx.order.findMany({
-      where: {
-        paymentStatus: PaymentStatus.PAID,
-        status: { not: OrderStatus.CANCELLED },
-        paymentDate: { gte: start, lt: end },
-      },
-      include: { orderDetails: true, user: { select: { id: true, name: true } } },
-    });
-  }
-
   // Dashboard: order counts by status, for the status-count cards and the
   // "unclaimed orders" figure (everything except CLAIMED/CANCELLED).
   async countByStatus(tx: PrismaClientOrTx = prisma): Promise<Record<OrderStatus, number>> {
```

**Diff — backend analytics controller, routes, and schema (deleted files):**

```diff
diff --git a/backend/src/controllers/analytics.controller.ts b/backend/src/controllers/analytics.controller.ts
deleted file mode 100644
index 1e246e6..0000000
--- a/backend/src/controllers/analytics.controller.ts
+++ /dev/null
@@ -1,104 +0,0 @@
-import { Request, Response } from "express";
-import {
-  revenueTrendService,
-  revenueByCategoryService,
-  revenueByStaffService,
-  cashVsGcashService,
-  expenseAnalyticsService,
-  simplifiedProfitService,
-  RevenueTrendGrouping,
-} from "../services/analytics/index.js";
-import { getBusinessDayRange } from "../lib/business-timezone.js";
-
-// Shared by every handler below: 'from'/'to' are already-validated
-// YYYY-MM-DD Manila calendar dates (schema/analytics) — this turns them
-// into the real UTC instant bounds spanning the full period, using the same
-// getBusinessDayRange helper the dashboard fix uses for a single day.
-function resolveRange(from: string, to: string): { start: Date; end: Date } {
-  return {
-    start: getBusinessDayRange(new Date(from)).start,
-    end: getBusinessDayRange(new Date(to)).end,
-  };
-}
-
-export class AnalyticsController {
-  public revenueTrend = async (req: Request, res: Response) => {
-    try {
-      const { from, to, groupBy } = req.query as unknown as {
-        from: string;
-        to: string;
-        groupBy: RevenueTrendGrouping;
-      };
-      const { start, end } = resolveRange(from, to);
-      const result = await revenueTrendService(start, end, groupBy);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.revenueTrend error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue trend" });
-    }
-  };
-
-  public revenueByCategory = async (req: Request, res: Response) => {
-    try {
-      const { from, to } = req.query as unknown as { from: string; to: string };
-      const { start, end } = resolveRange(from, to);
-      const result = await revenueByCategoryService(start, end);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.revenueByCategory error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue by category" });
-    }
-  };
-
-  public revenueByStaff = async (req: Request, res: Response) => {
-    try {
-      const { from, to } = req.query as unknown as { from: string; to: string };
-      const { start, end } = resolveRange(from, to);
-      const result = await revenueByStaffService(start, end);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.revenueByStaff error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue by staff" });
-    }
-  };
-
-  public cashVsGcash = async (req: Request, res: Response) => {
-    try {
-      const { from, to } = req.query as unknown as { from: string; to: string };
-      const { start, end } = resolveRange(from, to);
-      const result = await cashVsGcashService(start, end);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.cashVsGcash error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve cash vs GCash breakdown" });
-    }
-  };
-
-  public expenseAnalytics = async (req: Request, res: Response) => {
-    try {
-      const { from, to, groupBy } = req.query as unknown as {
-        from: string;
-        to: string;
-        groupBy: RevenueTrendGrouping;
-      };
-      const { start, end } = resolveRange(from, to);
-      const result = await expenseAnalyticsService(start, end, groupBy);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.expenseAnalytics error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve expense analytics" });
-    }
-  };
-
-  public simplifiedProfit = async (req: Request, res: Response) => {
-    try {
-      const { from, to } = req.query as unknown as { from: string; to: string };
-      const { start, end } = resolveRange(from, to);
-      const result = await simplifiedProfitService(start, end);
-      return res.status(result.code).json(result);
-    } catch (error) {
-      console.error("AnalyticsController.simplifiedProfit error", error);
-      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve simplified profit" });
-    }
-  };
-}
diff --git a/backend/src/routes/analytics.routes.ts b/backend/src/routes/analytics.routes.ts
deleted file mode 100644
index ad705da..0000000
--- a/backend/src/routes/analytics.routes.ts
+++ /dev/null
@@ -1,65 +0,0 @@
-import { Router } from "express";
-import { AnalyticsController } from "../controllers/analytics.controller.js";
-import { validateSchema } from "../middlewares/validate-schema.js";
-import { AuthMiddleware } from "../middlewares/auth-middleware.js";
-import { requireRole } from "../middlewares/require-role.js";
-import { Role } from "../../generated/prisma/client.js";
-import { dateRangeSchema, dateRangeWithGroupingSchema } from "../schema/analytics/index.js";
-
-const router = Router();
-const analyticsController = new AnalyticsController();
-const authMiddleware = new AuthMiddleware();
-
-// Admin-only across the board — revenue, profit, and per-staff figures are
-// business-sensitive in the same way Withdrawals/Audit Logs already are.
-// Backend capability only: not yet called by any frontend page (deferred to
-// a later phase per this task's explicit scope).
-router.get(
-  "/revenue/trend",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeWithGroupingSchema),
-  analyticsController.revenueTrend
-);
-
-router.get(
-  "/revenue/by-category",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeSchema),
-  analyticsController.revenueByCategory
-);
-
-router.get(
-  "/revenue/by-staff",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeSchema),
-  analyticsController.revenueByStaff
-);
-
-router.get(
-  "/cash-vs-gcash",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeSchema),
-  analyticsController.cashVsGcash
-);
-
-router.get(
-  "/expenses",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeWithGroupingSchema),
-  analyticsController.expenseAnalytics
-);
-
-router.get(
-  "/profit",
-  authMiddleware.execute,
-  requireRole(Role.ADMIN),
-  validateSchema(dateRangeSchema),
-  analyticsController.simplifiedProfit
-);
-
-export default router;
diff --git a/backend/src/schema/analytics/date-range-with-grouping.schema.ts b/backend/src/schema/analytics/date-range-with-grouping.schema.ts
deleted file mode 100644
index 105fcab..0000000
--- a/backend/src/schema/analytics/date-range-with-grouping.schema.ts
+++ /dev/null
@@ -1,18 +0,0 @@
-import { z } from "zod";
-
-const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");
-
-// Same date-range shape as date-range.schema.ts, plus the trend-bucketing
-// granularity for revenue-trend and expense-analytics.
-export const dateRangeWithGroupingSchema = z.object({
-  query: z
-    .object({
-      from: isoDate,
-      to: isoDate,
-      groupBy: z.enum(["day", "week", "month"]).default("day"),
-    })
-    .refine((q) => q.from <= q.to, {
-      message: "'from' must not be after 'to'",
-      path: ["to"],
-    }),
-});
diff --git a/backend/src/schema/analytics/date-range.schema.ts b/backend/src/schema/analytics/date-range.schema.ts
deleted file mode 100644
index 13b8c78..0000000
--- a/backend/src/schema/analytics/date-range.schema.ts
+++ /dev/null
@@ -1,20 +0,0 @@
-import { z } from "zod";
-
-// Manila calendar dates (YYYY-MM-DD), inclusive on both ends — the
-// controller converts these into real UTC instant bounds via
-// getBusinessDayRange, the same Asia/Manila logic used everywhere else in
-// this codebase. Shared by every analytics endpoint that just needs a
-// period, no grouping.
-const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");
-
-export const dateRangeSchema = z.object({
-  query: z
-    .object({
-      from: isoDate,
-      to: isoDate,
-    })
-    .refine((q) => q.from <= q.to, {
-      message: "'from' must not be after 'to'",
-      path: ["to"],
-    }),
-});
diff --git a/backend/src/schema/analytics/index.ts b/backend/src/schema/analytics/index.ts
deleted file mode 100644
index cc25b94..0000000
--- a/backend/src/schema/analytics/index.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export { dateRangeSchema } from "./date-range.schema.js";
-export { dateRangeWithGroupingSchema } from "./date-range-with-grouping.schema.js";
```

**Diff — backend analytics services (deleted files):**

```diff
diff --git a/backend/src/services/analytics/cash-vs-gcash.service.ts b/backend/src/services/analytics/cash-vs-gcash.service.ts
deleted file mode 100644
index b87564e..0000000
--- a/backend/src/services/analytics/cash-vs-gcash.service.ts
+++ /dev/null
@@ -1,30 +0,0 @@
-import { getOrderSummaryForRange } from "./order-summary.util.js";
-
-// Cash vs. GCash split for a date range — reuses the exact exclusion rule
-// already established for Shift Handover reconciliation (summarizeOrders,
-// reconciliation.util.ts): GCash counts toward totalSales but never toward
-// cashSalesTotal, matching physical drawer reality.
-export async function cashVsGcashService(start: Date, end: Date) {
-  try {
-    const { cashSalesTotal, digitalSalesTotal, totalSales } = await getOrderSummaryForRange(start, end);
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Cash vs GCash breakdown retrieved successfully",
-      data: {
-        range: { start, end },
-        cashSalesTotal,
-        gcashSalesTotal: digitalSalesTotal,
-        totalSales,
-      },
-    };
-  } catch (error) {
-    console.error("cashVsGcashService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve cash vs GCash breakdown",
-    };
-  }
-}
diff --git a/backend/src/services/analytics/expense-analytics.service.ts b/backend/src/services/analytics/expense-analytics.service.ts
deleted file mode 100644
index 17856e0..0000000
--- a/backend/src/services/analytics/expense-analytics.service.ts
+++ /dev/null
@@ -1,62 +0,0 @@
-import { ExpenseRepository } from "../../repositories/expense.repository.js";
-import { getBusinessDateOnly } from "../../lib/business-timezone.js";
-import { periodBucketKey, PeriodGrouping } from "./period-bucket.util.js";
-
-const expenseRepository = new ExpenseRepository();
-
-// Backend-computed replacement for the frontend's ad-hoc expense totals —
-// same layered approach as revenue-trend: one fetch, aggregated in the
-// service layer by period, category, and staff.
-export async function expenseAnalyticsService(start: Date, end: Date, groupBy: PeriodGrouping) {
-  try {
-    const expenses = await expenseRepository.findInRange(start, end);
-
-    const trendMap = new Map<string, number>();
-    const byCategoryMap = new Map<string, number>();
-    const byStaffMap = new Map<string, { name: string; total: number }>();
-    let totalExpenses = 0;
-
-    for (const expense of expenses) {
-      const amount = Number(expense.amount);
-      totalExpenses += amount;
-
-      const periodKey = periodBucketKey(getBusinessDateOnly(expense.expenseDate), groupBy);
-      trendMap.set(periodKey, (trendMap.get(periodKey) ?? 0) + amount);
-
-      byCategoryMap.set(expense.category, (byCategoryMap.get(expense.category) ?? 0) + amount);
-
-      const staffEntry = byStaffMap.get(expense.userId);
-      if (staffEntry) {
-        staffEntry.total += amount;
-      } else {
-        byStaffMap.set(expense.userId, { name: expense.user.name, total: amount });
-      }
-    }
-
-    const trend = Array.from(trendMap.entries())
-      .map(([period, total]) => ({ period, total }))
-      .sort((a, b) => a.period.localeCompare(b.period));
-
-    const byCategory = Array.from(byCategoryMap.entries())
-      .map(([category, total]) => ({ category, total }))
-      .sort((a, b) => b.total - a.total);
-
-    const byStaff = Array.from(byStaffMap.entries())
-      .map(([userId, totals]) => ({ userId, ...totals }))
-      .sort((a, b) => b.total - a.total);
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Expense analytics retrieved successfully",
-      data: { range: { start, end }, groupBy, totalExpenses, trend, byCategory, byStaff },
-    };
-  } catch (error) {
-    console.error("expenseAnalyticsService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve expense analytics",
-    };
-  }
-}
diff --git a/backend/src/services/analytics/index.ts b/backend/src/services/analytics/index.ts
deleted file mode 100644
index 6550f80..0000000
--- a/backend/src/services/analytics/index.ts
+++ /dev/null
@@ -1,7 +0,0 @@
-export { revenueTrendService } from "./revenue-trend.service.js";
-export type { PeriodGrouping as RevenueTrendGrouping } from "./period-bucket.util.js";
-export { revenueByCategoryService } from "./revenue-by-category.service.js";
-export { revenueByStaffService } from "./revenue-by-staff.service.js";
-export { cashVsGcashService } from "./cash-vs-gcash.service.js";
-export { expenseAnalyticsService } from "./expense-analytics.service.js";
-export { simplifiedProfitService } from "./simplified-profit.service.js";
diff --git a/backend/src/services/analytics/order-summary.util.ts b/backend/src/services/analytics/order-summary.util.ts
deleted file mode 100644
index 6f5372a..0000000
--- a/backend/src/services/analytics/order-summary.util.ts
+++ /dev/null
@@ -1,15 +0,0 @@
-import { OrderRepository } from "../../repositories/order.repository.js";
-import { summarizeOrders } from "../shift-handover/reconciliation.util.js";
-
-const orderRepository = new OrderRepository();
-
-// Single fetch-and-summarize step shared by revenue-by-category and
-// cash-vs-gcash — both want the exact same summarizeOrders() breakdown
-// (reconciliation.util.ts, already the established rule for GCash exclusion
-// and Package/Service/Inventory categorization) over the same paid,
-// non-cancelled orders for a period; this avoids querying twice when a
-// caller wants both.
-export async function getOrderSummaryForRange(start: Date, end: Date) {
-  const orders = await orderRepository.findPaidInRange(start, end);
-  return summarizeOrders(orders);
-}
diff --git a/backend/src/services/analytics/period-bucket.util.ts b/backend/src/services/analytics/period-bucket.util.ts
deleted file mode 100644
index a95beb1..0000000
--- a/backend/src/services/analytics/period-bucket.util.ts
+++ /dev/null
@@ -1,25 +0,0 @@
-export type PeriodGrouping = "day" | "week" | "month";
-
-function toIsoDate(date: Date): string {
-  return date.toISOString().slice(0, 10);
-}
-
-// Monday of the week containing `businessDate` (a UTC-midnight-anchored
-// Manila calendar date from getBusinessDateOnly) — plain UTC arithmetic on
-// that anchor, no further timezone conversion.
-function startOfWeek(businessDate: Date): Date {
-  const dayOfWeek = businessDate.getUTCDay(); // 0 = Sunday
-  const daysSinceMonday = (dayOfWeek + 6) % 7;
-  const monday = new Date(businessDate);
-  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
-  return monday;
-}
-
-// Shared by revenue-trend and expense-analytics — one bucketing rule for
-// "what period does this business date belong to," fed a business date
-// already produced by getBusinessDateOnly (lib/business-timezone.ts).
-export function periodBucketKey(businessDate: Date, groupBy: PeriodGrouping): string {
-  if (groupBy === "day") return toIsoDate(businessDate);
-  if (groupBy === "week") return toIsoDate(startOfWeek(businessDate));
-  return businessDate.toISOString().slice(0, 7); // "YYYY-MM"
-}
diff --git a/backend/src/services/analytics/revenue-by-category.service.ts b/backend/src/services/analytics/revenue-by-category.service.ts
deleted file mode 100644
index 04fc252..0000000
--- a/backend/src/services/analytics/revenue-by-category.service.ts
+++ /dev/null
@@ -1,31 +0,0 @@
-import { getOrderSummaryForRange } from "./order-summary.util.js";
-
-// Category split (Package / Service / Inventory) for a date range, reusing
-// summarizeOrders (reconciliation.util.ts) — the same grouping already used
-// by Shift Handover, not a reinvented rule.
-export async function revenueByCategoryService(start: Date, end: Date) {
-  try {
-    const { laundryEarnings, supplySales, customServiceSales, totalSales } =
-      await getOrderSummaryForRange(start, end);
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Revenue by category retrieved successfully",
-      data: {
-        range: { start, end },
-        laundryEarnings,
-        supplySales,
-        customServiceSales,
-        totalSales,
-      },
-    };
-  } catch (error) {
-    console.error("revenueByCategoryService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve revenue by category",
-    };
-  }
-}
diff --git a/backend/src/services/analytics/revenue-by-staff.service.ts b/backend/src/services/analytics/revenue-by-staff.service.ts
deleted file mode 100644
index 21b89ee..0000000
--- a/backend/src/services/analytics/revenue-by-staff.service.ts
+++ /dev/null
@@ -1,42 +0,0 @@
-import { OrderRepository } from "../../repositories/order.repository.js";
-
-const orderRepository = new OrderRepository();
-
-// Per-staff revenue totals for a date range — grouped in the service layer
-// from a single fetch, same "repository fetches raw rows, service
-// aggregates" convention used by findPaidPackageLines/summarizeOrders.
-export async function revenueByStaffService(start: Date, end: Date) {
-  try {
-    const orders = await orderRepository.findPaidInRange(start, end);
-
-    const totalsByStaff = new Map<string, { name: string; revenue: number; orderCount: number }>();
-    for (const order of orders) {
-      const existing = totalsByStaff.get(order.userId);
-      const amount = Number(order.totalAmount);
-      if (existing) {
-        existing.revenue += amount;
-        existing.orderCount += 1;
-      } else {
-        totalsByStaff.set(order.userId, { name: order.user.name, revenue: amount, orderCount: 1 });
-      }
-    }
-
-    const byStaff = Array.from(totalsByStaff.entries())
-      .map(([userId, totals]) => ({ userId, ...totals }))
-      .sort((a, b) => b.revenue - a.revenue);
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Revenue by staff retrieved successfully",
-      data: { range: { start, end }, byStaff },
-    };
-  } catch (error) {
-    console.error("revenueByStaffService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve revenue by staff",
-    };
-  }
-}
diff --git a/backend/src/services/analytics/revenue-trend.service.ts b/backend/src/services/analytics/revenue-trend.service.ts
deleted file mode 100644
index 480adf4..0000000
--- a/backend/src/services/analytics/revenue-trend.service.ts
+++ /dev/null
@@ -1,42 +0,0 @@
-import { OrderRepository } from "../../repositories/order.repository.js";
-import { getBusinessDateOnly } from "../../lib/business-timezone.js";
-import { periodBucketKey, PeriodGrouping } from "./period-bucket.util.js";
-
-const orderRepository = new OrderRepository();
-
-export type { PeriodGrouping as RevenueTrendGrouping };
-
-// Daily/weekly/monthly revenue trend for a date range. Fetches once and
-// buckets in memory (order volumes here don't warrant a raw-SQL date_trunc
-// query) using the same Manila business-date logic as everywhere else in
-// this codebase — not a second, divergent timezone implementation.
-export async function revenueTrendService(start: Date, end: Date, groupBy: PeriodGrouping) {
-  try {
-    const orders = await orderRepository.findPaidInRange(start, end);
-
-    const totalsByBucket = new Map<string, number>();
-    for (const order of orders) {
-      if (!order.paymentDate) continue; // PAID orders always have one; guard for type safety only
-      const key = periodBucketKey(getBusinessDateOnly(order.paymentDate), groupBy);
-      totalsByBucket.set(key, (totalsByBucket.get(key) ?? 0) + Number(order.totalAmount));
-    }
-
-    const trend = Array.from(totalsByBucket.entries())
-      .map(([period, revenue]) => ({ period, revenue }))
-      .sort((a, b) => a.period.localeCompare(b.period));
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Revenue trend retrieved successfully",
-      data: { range: { start, end }, groupBy, trend },
-    };
-  } catch (error) {
-    console.error("revenueTrendService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve revenue trend",
-    };
-  }
-}
diff --git a/backend/src/services/analytics/simplified-profit.service.ts b/backend/src/services/analytics/simplified-profit.service.ts
deleted file mode 100644
index 80bd18e..0000000
--- a/backend/src/services/analytics/simplified-profit.service.ts
+++ /dev/null
@@ -1,48 +0,0 @@
-import { OrderRepository } from "../../repositories/order.repository.js";
-import { ExpenseRepository } from "../../repositories/expense.repository.js";
-
-const orderRepository = new OrderRepository();
-const expenseRepository = new ExpenseRepository();
-
-// Hard requirement, not polish: this label must travel with the number
-// everywhere it's returned, so no caller can display simplifiedProfit
-// without also seeing what it excludes. Do not remove or shorten this in a
-// way that drops the explicit exclusions.
-export const SIMPLIFIED_PROFIT_LABEL =
-  "Simplified Profit — Revenue minus recorded expenses; does not include cost of goods, discounts, or refunds.";
-
-// Revenue (Paid, non-Cancelled) minus recorded Expenses for a period. Not
-// true accounting profit — see SIMPLIFIED_PROFIT_LABEL, always returned
-// alongside the figure.
-export async function simplifiedProfitService(start: Date, end: Date) {
-  try {
-    const range = { start, end };
-    const [revenue, expenses] = await Promise.all([
-      orderRepository.sumPaidRevenue(range),
-      expenseRepository.findInRange(start, end),
-    ]);
-
-    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
-    const simplifiedProfit = revenue - totalExpenses;
-
-    return {
-      code: 200,
-      status: "success",
-      message: "Simplified profit retrieved successfully",
-      data: {
-        range,
-        revenue,
-        totalExpenses,
-        simplifiedProfit,
-        label: SIMPLIFIED_PROFIT_LABEL,
-      },
-    };
-  } catch (error) {
-    console.error("simplifiedProfitService error", error);
-    return {
-      code: 500,
-      status: "error",
-      message: "Unable to retrieve simplified profit",
-    };
-  }
-}
```

**Diff — frontend Analytics page and API client (deleted files):**

```diff
diff --git a/frontend/app/admin/(dashboard)/analytics/page.tsx b/frontend/app/admin/(dashboard)/analytics/page.tsx
deleted file mode 100644
index 6141175..0000000
--- a/frontend/app/admin/(dashboard)/analytics/page.tsx
+++ /dev/null
@@ -1,323 +0,0 @@
-"use client";
-
-import { useEffect, useState } from "react";
-import { Wallet, TrendingUp, Receipt, PiggyBank, Smartphone, BanknoteIcon } from "lucide-react";
-import AdminStatCard from "../../../components/admincom/AdminStatCard";
-import {
-  getRevenueTrend,
-  getRevenueByCategory,
-  getRevenueByStaff,
-  getCashVsGcash,
-  getExpenseAnalytics,
-  getSimplifiedProfit,
-  PeriodGrouping,
-  RevenueTrendPoint,
-  RevenueByCategory,
-  RevenueByStaffEntry,
-  CashVsGcash,
-  ExpenseTrendPoint,
-  ExpenseByCategoryEntry,
-  ExpenseByStaffEntry,
-  SimplifiedProfit,
-} from "../../../lib/services/analyticsApi.service";
-import { ApiError } from "../../../lib/apiClient";
-
-function toIsoDate(d: Date): string {
-  return d.toISOString().slice(0, 10);
-}
-
-function defaultFrom(): string {
-  const d = new Date();
-  d.setDate(d.getDate() - 29); // 30-day window inclusive of today
-  return toIsoDate(d);
-}
-
-// Lightweight, dependency-free horizontal bar row — this app doesn't use a
-// charting library anywhere else, so a real chart lib would be a new
-// dependency for one page rather than following existing convention.
-function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
-  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
-  return (
-    <div className="flex items-center gap-3 text-sm">
-      <span className="w-24 sm:w-28 shrink-0 text-gray-600 truncate">{label}</span>
-      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
-        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
-      </div>
-      <span className="w-24 shrink-0 text-right text-gray-900 font-medium">₱{value.toFixed(2)}</span>
-    </div>
-  );
-}
-
-export default function AdminAnalyticsPage() {
-  const [from, setFrom] = useState(defaultFrom());
-  const [to, setTo] = useState(toIsoDate(new Date()));
-  const [groupBy, setGroupBy] = useState<PeriodGrouping>("day");
-
-  const [profit, setProfit] = useState<SimplifiedProfit | null>(null);
-  const [cashVsGcash, setCashVsGcash] = useState<CashVsGcash | null>(null);
-  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory | null>(null);
-  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
-  const [revenueByStaff, setRevenueByStaff] = useState<RevenueByStaffEntry[]>([]);
-  const [expenseTotal, setExpenseTotal] = useState(0);
-  const [expenseTrend, setExpenseTrend] = useState<ExpenseTrendPoint[]>([]);
-  const [expenseByCategory, setExpenseByCategory] = useState<ExpenseByCategoryEntry[]>([]);
-  const [expenseByStaff, setExpenseByStaff] = useState<ExpenseByStaffEntry[]>([]);
-
-  const [loading, setLoading] = useState(true);
-  const [loadError, setLoadError] = useState("");
-
-  useEffect(() => {
-    async function load() {
-      setLoading(true);
-      setLoadError("");
-      try {
-        const [profitData, cashData, categoryData, trendData, staffData, expenseData] = await Promise.all([
-          getSimplifiedProfit(from, to),
-          getCashVsGcash(from, to),
-          getRevenueByCategory(from, to),
-          getRevenueTrend(from, to, groupBy),
-          getRevenueByStaff(from, to),
-          getExpenseAnalytics(from, to, groupBy),
-        ]);
-
-        setProfit(profitData);
-        setCashVsGcash(cashData);
-        setRevenueByCategory(categoryData);
-        setRevenueTrend(trendData.trend);
-        setRevenueByStaff(staffData.byStaff);
-        setExpenseTotal(expenseData.totalExpenses);
-        setExpenseTrend(expenseData.trend);
-        setExpenseByCategory(expenseData.byCategory);
-        setExpenseByStaff(expenseData.byStaff);
-      } catch (err) {
-        setLoadError(err instanceof ApiError ? err.message : "Unable to load analytics data.");
-      } finally {
-        setLoading(false);
-      }
-    }
-    load();
-  }, [from, to, groupBy]);
-
-  const maxRevenueTrend = Math.max(0, ...revenueTrend.map((p) => p.revenue));
-  const maxExpenseTrend = Math.max(0, ...expenseTrend.map((p) => p.total));
-  const maxExpenseCategory = Math.max(0, ...expenseByCategory.map((c) => c.total));
-  const maxStaffRevenue = Math.max(0, ...revenueByStaff.map((s) => s.revenue));
-
-  return (
-    <div className="p-4 sm:p-6">
-      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6 bg-white rounded-xl shadow-md p-4">
-        <div className="flex items-center gap-2">
-          <label htmlFor="analytics-from" className="text-sm text-gray-500 whitespace-nowrap">
-            From
-          </label>
-          <input
-            id="analytics-from"
-            type="date"
-            value={from}
-            max={to}
-            onChange={(e) => setFrom(e.target.value)}
-            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
-          />
-        </div>
-        <div className="flex items-center gap-2">
-          <label htmlFor="analytics-to" className="text-sm text-gray-500 whitespace-nowrap">
-            To
-          </label>
-          <input
-            id="analytics-to"
-            type="date"
-            value={to}
-            min={from}
-            max={toIsoDate(new Date())}
-            onChange={(e) => setTo(e.target.value)}
-            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
-          />
-        </div>
-        <div className="flex items-center gap-2">
-          <label htmlFor="analytics-groupby" className="text-sm text-gray-500 whitespace-nowrap">
-            Group by
-          </label>
-          <select
-            id="analytics-groupby"
-            value={groupBy}
-            onChange={(e) => setGroupBy(e.target.value as PeriodGrouping)}
-            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
-          >
-            <option value="day">Day</option>
-            <option value="week">Week</option>
-            <option value="month">Month</option>
-          </select>
-        </div>
-      </div>
-
-      {loading ? (
-        <p className="text-gray-400 p-6">Loading analytics...</p>
-      ) : loadError ? (
-        <p className="text-red-500 p-6">{loadError}</p>
-      ) : (
-        <>
-          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
-            <AdminStatCard
-              label="Revenue"
-              value={`₱${(profit?.revenue ?? 0).toFixed(2)}`}
-              icon={TrendingUp}
-              iconColor="text-blue-600 bg-blue-100"
-            />
-            <AdminStatCard
-              label="Recorded Expenses"
-              value={`₱${(profit?.totalExpenses ?? 0).toFixed(2)}`}
-              icon={Receipt}
-              iconColor="text-red-600 bg-red-100"
-            />
-            <AdminStatCard
-              label="Simplified Profit"
-              value={`₱${(profit?.simplifiedProfit ?? 0).toFixed(2)}`}
-              icon={PiggyBank}
-              iconColor="text-green-600 bg-green-100"
-            />
-            <AdminStatCard
-              label="Cash Sales"
-              value={`₱${(cashVsGcash?.cashSalesTotal ?? 0).toFixed(2)}`}
-              icon={BanknoteIcon}
-              iconColor="text-emerald-600 bg-emerald-100"
-            />
-            <AdminStatCard
-              label="GCash Sales"
-              value={`₱${(cashVsGcash?.gcashSalesTotal ?? 0).toFixed(2)}`}
-              icon={Smartphone}
-              iconColor="text-sky-600 bg-sky-100"
-            />
-            <AdminStatCard
-              label="Custom Service Sales"
-              value={`₱${(revenueByCategory?.customServiceSales ?? 0).toFixed(2)}`}
-              icon={Wallet}
-              iconColor="text-purple-600 bg-purple-100"
-            />
-          </div>
-
-          {/* This disclaimer must stay directly beside the Simplified Profit
-              figure above, per the audit's explicit requirement — never move
-              it somewhere the number could be read without it. */}
-          {profit?.label && (
-            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-6">
-              {profit.label}
-            </p>
-          )}
-
-          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
-            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h2>
-            {revenueTrend.length > 0 ? (
-              <div className="space-y-2">
-                {revenueTrend.map((p) => (
-                  <BarRow key={p.period} label={p.period} value={p.revenue} max={maxRevenueTrend} color="bg-blue-500" />
-                ))}
-              </div>
-            ) : (
-              <p className="text-gray-400 text-center py-4">No revenue in this period.</p>
-            )}
-          </div>
-
-          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
-            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
-              <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue by Category</h2>
-              <div className="space-y-2">
-                <BarRow
-                  label="Laundry"
-                  value={revenueByCategory?.laundryEarnings ?? 0}
-                  max={revenueByCategory?.totalSales ?? 0}
-                  color="bg-blue-500"
-                />
-                <BarRow
-                  label="Supplies"
-                  value={revenueByCategory?.supplySales ?? 0}
-                  max={revenueByCategory?.totalSales ?? 0}
-                  color="bg-purple-500"
-                />
-                <BarRow
-                  label="Custom Service"
-                  value={revenueByCategory?.customServiceSales ?? 0}
-                  max={revenueByCategory?.totalSales ?? 0}
-                  color="bg-amber-500"
-                />
-              </div>
-            </div>
-
-            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
-              <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue by Staff</h2>
-              {revenueByStaff.length > 0 ? (
-                <div className="space-y-2">
-                  {revenueByStaff.map((s) => (
-                    <BarRow key={s.userId} label={s.name} value={s.revenue} max={maxStaffRevenue} color="bg-green-500" />
-                  ))}
-                </div>
-              ) : (
-                <p className="text-gray-400 text-center py-4">No revenue in this period.</p>
-              )}
-            </div>
-          </div>
-
-          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
-            <div className="flex items-center justify-between mb-4">
-              <h2 className="text-lg font-bold text-gray-900">Expense Trend</h2>
-              <span className="text-sm text-gray-500">Total: ₱{expenseTotal.toFixed(2)}</span>
-            </div>
-            {expenseTrend.length > 0 ? (
-              <div className="space-y-2">
-                {expenseTrend.map((p) => (
-                  <BarRow key={p.period} label={p.period} value={p.total} max={maxExpenseTrend} color="bg-red-500" />
-                ))}
-              </div>
-            ) : (
-              <p className="text-gray-400 text-center py-4">No expenses in this period.</p>
-            )}
-          </div>
-
-          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
-            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
-              <h2 className="text-lg font-bold text-gray-900 mb-4">Expenses by Category</h2>
-              {expenseByCategory.length > 0 ? (
-                <div className="space-y-2">
-                  {expenseByCategory.map((c) => (
-                    <BarRow key={c.category} label={c.category} value={c.total} max={maxExpenseCategory} color="bg-orange-500" />
-                  ))}
-                </div>
-              ) : (
-                <p className="text-gray-400 text-center py-4">No expenses in this period.</p>
-              )}
-            </div>
-
-            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
-              <h2 className="text-lg font-bold text-gray-900 mb-4">Expenses by Staff</h2>
-              <div className="overflow-x-auto">
-                <table className="w-full text-sm text-left">
-                  <thead>
-                    <tr className="text-gray-700 border-b bg-gray-50">
-                      <th className="p-2 whitespace-nowrap">Staff</th>
-                      <th className="p-2 whitespace-nowrap">Total</th>
-                    </tr>
-                  </thead>
-                  <tbody>
-                    {expenseByStaff.length > 0 ? (
-                      expenseByStaff.map((s) => (
-                        <tr key={s.userId} className="border-b last:border-0">
-                          <td className="p-2 whitespace-nowrap text-gray-900">{s.name}</td>
-                          <td className="p-2 whitespace-nowrap text-gray-900">₱{s.total.toFixed(2)}</td>
-                        </tr>
-                      ))
-                    ) : (
-                      <tr>
-                        <td colSpan={2} className="p-4 text-center text-gray-400">
-                          No expenses in this period.
-                        </td>
-                      </tr>
-                    )}
-                  </tbody>
-                </table>
-              </div>
-            </div>
-          </div>
-        </>
-      )}
-    </div>
-  );
-}
diff --git a/frontend/app/lib/services/analyticsApi.service.ts b/frontend/app/lib/services/analyticsApi.service.ts
deleted file mode 100644
index b62db2e..0000000
--- a/frontend/app/lib/services/analyticsApi.service.ts
+++ /dev/null
@@ -1,105 +0,0 @@
-import { apiClient } from "../apiClient";
-
-export type PeriodGrouping = "day" | "week" | "month";
-
-export interface RevenueTrendPoint {
-  period: string;
-  revenue: number;
-}
-
-export interface RevenueTrend {
-  groupBy: PeriodGrouping;
-  trend: RevenueTrendPoint[];
-}
-
-export interface RevenueByCategory {
-  laundryEarnings: number;
-  supplySales: number;
-  customServiceSales: number;
-  totalSales: number;
-}
-
-export interface RevenueByStaffEntry {
-  userId: string;
-  name: string;
-  revenue: number;
-  orderCount: number;
-}
-
-export interface CashVsGcash {
-  cashSalesTotal: number;
-  gcashSalesTotal: number;
-  totalSales: number;
-}
-
-export interface ExpenseTrendPoint {
-  period: string;
-  total: number;
-}
-
-export interface ExpenseByCategoryEntry {
-  category: string;
-  total: number;
-}
-
-export interface ExpenseByStaffEntry {
-  userId: string;
-  name: string;
-  total: number;
-}
-
-export interface ExpenseAnalytics {
-  groupBy: PeriodGrouping;
-  totalExpenses: number;
-  trend: ExpenseTrendPoint[];
-  byCategory: ExpenseByCategoryEntry[];
-  byStaff: ExpenseByStaffEntry[];
-}
-
-export interface SimplifiedProfit {
-  revenue: number;
-  totalExpenses: number;
-  simplifiedProfit: number;
-  // Always render this alongside the number — see backend
-  // SIMPLIFIED_PROFIT_LABEL (simplified-profit.service.ts): this figure
-  // deliberately excludes cost of goods, discounts, and refunds.
-  label: string;
-}
-
-function qs(from: string, to: string, groupBy?: PeriodGrouping): string {
-  const params = new URLSearchParams({ from, to });
-  if (groupBy) params.set("groupBy", groupBy);
-  return params.toString();
-}
-
-export async function getRevenueTrend(
-  from: string,
-  to: string,
-  groupBy: PeriodGrouping
-): Promise<RevenueTrend> {
-  return apiClient.get(`/analytics/revenue/trend?${qs(from, to, groupBy)}`);
-}
-
-export async function getRevenueByCategory(from: string, to: string): Promise<RevenueByCategory> {
-  return apiClient.get(`/analytics/revenue/by-category?${qs(from, to)}`);
-}
-
-export async function getRevenueByStaff(from: string, to: string): Promise<{ byStaff: RevenueByStaffEntry[] }> {
-  return apiClient.get(`/analytics/revenue/by-staff?${qs(from, to)}`);
-}
-
-export async function getCashVsGcash(from: string, to: string): Promise<CashVsGcash> {
-  return apiClient.get(`/analytics/cash-vs-gcash?${qs(from, to)}`);
-}
-
-export async function getExpenseAnalytics(
-  from: string,
-  to: string,
-  groupBy: PeriodGrouping
-): Promise<ExpenseAnalytics> {
-  return apiClient.get(`/analytics/expenses?${qs(from, to, groupBy)}`);
-}
-
-export async function getSimplifiedProfit(from: string, to: string): Promise<SimplifiedProfit> {
-  return apiClient.get(`/analytics/profit?${qs(from, to)}`);
-}
```

---

## Group 5 — Everything Else

**Nothing.** Every one of the 26 changed files fit cleanly into Groups 1–4 above (with two files — `order.repository.ts` — explicitly flagged as split between Group 3 and Group 4 rather than forced into one). There is no leftover bucket.

---

## File Tally (all 26 accounted for)

| # | File | Group |
|---|---|---|
| 1 | `backend/src/services/auth/login.service.ts` | 1 — Security |
| 2 | `backend/src/services/auth/refresh-token.service.ts` | 1 — Security |
| 3 | `backend/src/repositories/token.repository.ts` | 1 — Security |
| 4 | `backend/src/services/order/update-order-status.service.ts` | 2 — Order lifecycle |
| 5 | `backend/src/services/order/cancel-order.service.ts` | 2 — Order lifecycle |
| 6 | `backend/src/services/dashboard/get-staff-dashboard.service.ts` | 3 — Dashboard fix |
| 7 | `backend/src/controllers/analytics.controller.ts` | 4 — Analytics removal |
| 8 | `backend/src/routes/analytics.routes.ts` | 4 — Analytics removal |
| 9 | `backend/src/routes/index.ts` | 4 — Analytics removal |
| 10 | `backend/src/schema/analytics/date-range-with-grouping.schema.ts` | 4 — Analytics removal |
| 11 | `backend/src/schema/analytics/date-range.schema.ts` | 4 — Analytics removal |
| 12 | `backend/src/schema/analytics/index.ts` | 4 — Analytics removal |
| 13 | `backend/src/services/analytics/cash-vs-gcash.service.ts` | 4 — Analytics removal |
| 14 | `backend/src/services/analytics/expense-analytics.service.ts` | 4 — Analytics removal |
| 15 | `backend/src/services/analytics/index.ts` | 4 — Analytics removal |
| 16 | `backend/src/services/analytics/order-summary.util.ts` | 4 — Analytics removal |
| 17 | `backend/src/services/analytics/period-bucket.util.ts` | 4 — Analytics removal |
| 18 | `backend/src/services/analytics/revenue-by-category.service.ts` | 4 — Analytics removal |
| 19 | `backend/src/services/analytics/revenue-by-staff.service.ts` | 4 — Analytics removal |
| 20 | `backend/src/services/analytics/revenue-trend.service.ts` | 4 — Analytics removal |
| 21 | `backend/src/services/analytics/simplified-profit.service.ts` | 4 — Analytics removal |
| 22 | `frontend/app/admin/(dashboard)/analytics/page.tsx` | 4 — Analytics removal |
| 23 | `frontend/app/lib/services/analyticsApi.service.ts` | 4 — Analytics removal |
| 24 | `frontend/app/components/admincom/AdminSidebar.tsx` | 4 — Analytics removal |
| 25 | `backend/src/repositories/expense.repository.ts` | 4 — Analytics removal |
| 26 | `backend/src/repositories/order.repository.ts` | 4 — Analytics removal *(+ shares its `countClaimedInRange` addition with Group 3)* |

**Nothing has been committed or pushed.** This file is informational only — the working tree is exactly as it was before this file was created (this file itself is a new, untracked file, not a change to any of the 26).
