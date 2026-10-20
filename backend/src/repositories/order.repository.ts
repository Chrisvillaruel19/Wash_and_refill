import { prisma } from "../lib/prisma.js";
import { Prisma, OrderStatus, PaymentStatus, PaymentMethod, ServiceType } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Orders can grow large over time (unlike the small catalog tables), so
// list intentionally stays lean — customer info plus just enough of the
// staff member's identity to display who created the order, not the full
// nested line-item tree. getById returns the full detail.
// Refund amounts and methods — enough for the screens to show "Refunded",
// "Partially refunded", how much is left, and how it was paid back.
const refundAmounts = { select: { amount: true, method: true, paidOutAt: true } } as const;
const listInclude = { customer: true, user: { select: { id: true, name: true } }, refunds: refundAmounts } as const;
const detailInclude = {
  customer: true,
  // Staff name for New Order's receipt.
  user: { select: { id: true, name: true } },
  refunds: refundAmounts,
  orderDetails: {
    include: { service: true, package: true, inventory: true },
  },
  consumptions: {
    include: { inventory: true },
  },
} as const;

// "One staff member's orders" (Staff Sales): an order belongs to whoever
// received its payment; until it's paid, to whoever created it. So a
// turned-over unpaid order moves to the staff member who collects payment.
function ownedBy(userId: string): Prisma.OrderWhereInput {
  return { OR: [{ paidById: userId }, { paidById: null, userId }] };
}

function listWhere(params: { userId?: string; excludeSelfService?: boolean }): Prisma.OrderWhereInput {
  return {
    ...(params.userId ? ownedBy(params.userId) : {}),
    ...(params.excludeSelfService ? { isSelfService: false } : {}),
  };
}

export class OrderRepository {
  // Paginated, newest first — matches AuditLogRepository.findAll's shape.
  // userId (optional) narrows to one staff member's own orders — the Staff
  // Sales page; omitted = every order (Services, Claim Monitoring, etc.).
  // includeItems opts into line items for bulk export (still paginated,
  // and without the consumptions tree getById carries).
  // excludeSelfService drops self-service orders (Service Management and
  // Claim Monitoring only track drop-off laundry; Sales still sees them).
  async findAll(
    params: { page: number; pageSize: number; userId?: string; includeItems?: boolean; excludeSelfService?: boolean },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.findMany({
      where: listWhere(params),
      include: params.includeItems ? { ...listInclude, orderDetails: detailInclude.orderDetails } : listInclude,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  }

  async count(params: { userId?: string; excludeSelfService?: boolean } = {}, tx: PrismaClientOrTx = prisma) {
    return tx.order.count({ where: listWhere(params) });
  }

  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findUnique({ where: { id }, include: detailInclude });
  }

  async create(
    data: {
      customerId: string;
      customerName: string;
      customerPhone: string | null;
      userId: string;
      status: OrderStatus;
      claimedDate?: Date | null;
      isSelfService?: boolean;
      paymentMethod?: PaymentMethod;
      paymentStatus: PaymentStatus;
      paidById: string | null;
      amountPaid: number;
      totalAmount: number;
      paymentDate: Date | null;
      idempotencyKey: string;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.create({ data });
  }

  // Idempotent-replay lookup: after a P2002 on idempotencyKey, fetch the
  // order that already owns that key (via findById's full detailInclude)
  // to return as-is instead of creating a duplicate.
  async findByIdempotencyKey(idempotencyKey: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findUnique({ where: { idempotencyKey }, include: detailInclude });
  }

  async createOrderDetails(
    orderId: string,
    details: {
      serviceId?: string;
      serviceType?: ServiceType;
      packageId?: string;
      inventoryId?: string;
      weight?: number;
      quantity: number;
      subtotal: number;
    }[],
    tx: PrismaClientOrTx = prisma
  ) {
    await tx.orderDetail.createMany({
      data: details.map((d) => ({ ...d, orderId })),
    });
  }

  async createConsumptions(
    orderId: string,
    consumptions: { inventoryId: string; quantityUsed: number }[],
    tx: PrismaClientOrTx = prisma
  ) {
    if (consumptions.length === 0) return;
    await tx.inventoryConsumption.createMany({
      data: consumptions.map((c) => ({ ...c, orderId })),
    });
  }

  async findConsumptionsByOrderId(orderId: string, tx: PrismaClientOrTx = prisma) {
    return tx.inventoryConsumption.findMany({ where: { orderId } });
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    extra: { claimedDate?: Date } = {},
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.update({ where: { id }, data: { status, ...extra } });
  }

  // Backs both Mark as Paid and Refund — amountPaid is only ever
  // passed on the Mark as Paid path; omitting it here (Refund)
  // leaves the existing figure untouched rather than zeroing it out.
  async updatePaymentStatus(
    id: string,
    data: { paymentStatus: PaymentStatus; paymentDate: Date | null; amountPaid?: number },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.update({
      where: { id },
      data: {
        paymentStatus: data.paymentStatus,
        paymentDate: data.paymentDate,
        ...(data.amountPaid !== undefined ? { amountPaid: data.amountPaid } : {}),
      },
    });
  }

  // Race-safe variant of updatePaymentStatus: the WHERE clause also asserts
  // the order's paymentStatus is still what the caller last observed —
  // mirrors inventory.repository.ts's decrementIfSufficient (atomic
  // conditional UPDATE, not read-then-write). Two concurrent mark-paid/
  // refund requests on the same order can no longer both succeed:
  // the second one's updateMany matches 0 rows, which the caller treats as
  // a lost race rather than silently double-writing.
  async updatePaymentStatusIfCurrentlyIs(
    id: string,
    expectedStatus: PaymentStatus,
    data: {
      paymentStatus: PaymentStatus;
      paymentDate: Date | null;
      amountPaid?: number;
      paymentMethod?: PaymentMethod;
      paidById?: string;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.updateMany({
      where: { id, paymentStatus: expectedStatus },
      data: {
        paymentStatus: data.paymentStatus,
        paymentDate: data.paymentDate,
        ...(data.amountPaid !== undefined ? { amountPaid: data.amountPaid } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.paidById !== undefined ? { paidById: data.paidById } : {}),
      },
    });
  }

  // Claim-based reconciliation source (global, no userId filter): every
  // currently-unclaimed paid order — regardless of who created it. This is
  // a plain read (no FOR UPDATE); it's only ever called by Withdrawal's live
  // balance check or by the caller after it has already locked the
  // specific rows it intends to claim via lockUnclaimedPaidIds below.
  //
  // Cancelled orders are excluded, paid or not: when Staff cancel a paid
  // order they take its cash out of the drawer and keep it aside until the
  // Admin refunds it, so it's never part of the drawer (or GCash) balance —
  // and never claimed by a Shift Handover.
  async findUnclaimedPaid(tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: { not: OrderStatus.CANCELLED },
        shiftHandoverId: null,
      },
      include: { orderDetails: true },
    });
  }

  // The actual claim step for Shift Handover creation: locks the matching
  // rows via FOR UPDATE (re-evaluated by Postgres after the lock is
  // acquired, so a row already claimed by a just-committed concurrent
  // handover is correctly excluded, never double-claimed), returning just
  // their ids. Must run inside a transaction that already holds the
  // DrawerState lock.
  async lockUnclaimedPaidIds(tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Order"
      WHERE "paymentStatus" = 'PAID'
        AND "status" != 'CANCELLED'
        AND "shiftHandoverId" IS NULL
      FOR UPDATE
    `;
    return rows.map((r) => r.id);
  }

  async claim(ids: string[], shiftHandoverId: string, tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return;
    await tx.order.updateMany({ where: { id: { in: ids } }, data: { shiftHandoverId } });
  }

  // Fetches the full shape (with orderDetails, for the category breakdown)
  // of a specific, already-locked set of ids.
  async findByIds(ids: string[], tx: PrismaClientOrTx = prisma) {
    if (ids.length === 0) return [];
    return tx.order.findMany({ where: { id: { in: ids } }, include: { orderDetails: true } });
  }

  // Real per-order-detail data for Sales' Package/Supply breakdown widgets.
  // GET /orders (list, findAll above) intentionally omits orderDetails to
  // stay lean, which is why those widgets historically computed against
  // `items: undefined` client-side and were always empty regardless of what
  // was actually sold. Scoped either to a specific already-claimed
  // ShiftHandover (Admin Sales Summary's per-shift view) or to a
  // payment-date range (unscoped = all time, e.g. the general Sales page).
  // paymentDateGte/paymentDateLt are already-resolved UTC instants (Manila
  // business-day bounds) — this method does no date math of its own.
  async findPaidWithDetails(
    params: { shiftHandoverId?: string; paymentDateGte?: Date; paymentDateLt?: Date; userId?: string },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: { not: OrderStatus.CANCELLED },
        ...(params.userId ? { paidById: params.userId } : {}),
        ...(params.shiftHandoverId ? { shiftHandoverId: params.shiftHandoverId } : {}),
        ...(params.paymentDateGte || params.paymentDateLt
          ? {
              paymentDate: {
                ...(params.paymentDateGte ? { gte: params.paymentDateGte } : {}),
                ...(params.paymentDateLt ? { lt: params.paymentDateLt } : {}),
              },
            }
          : {}),
      },
      include: { orderDetails: { include: { package: true, inventory: true } } },
    });
  }

  // Unreported-activity check for Attendance's clock-out gate: any
  // unclaimed order still eligible for reconciliation — exactly the rows
  // lockUnclaimedPaidIds below claims (paid, not cancelled — a cancelled
  // order's cash is set aside, never claimed), so every row here can always
  // be resolved by submitting a Shift Handover.
  //
  // paymentStatus: PAID for the same reason — matches lockUnclaimedPaidIds
  // below exactly (and update-order-status.service.ts's CLAIMED-requires-
  // PAID rule, which is deliberately the same "claim" concept). An unpaid
  // order can never be claimed by a Shift Handover in the first place (its
  // claim query only ever locks PAID rows), so without this filter an
  // unpaid order would block Clock Out/Logout with no way to resolve it via
  // the "submit a Shift Handover" guidance those flows actually give —
  // Mark as Paid or Cancel are the real resolutions for an unpaid order,
  // not a Shift Handover.
  async findUnclaimedForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      where: {
        // The sale is whoever received the payment (paidById), not the creator.
        paidById: userId,
        shiftHandoverId: null,
        status: { not: OrderStatus.CANCELLED },
        paymentStatus: PaymentStatus.PAID,
      },
    });
  }

  // Dashboard: how many orders were actually claimed within a date range
  // (Staff Dashboard's "Claimed today" card) — scoped by claimedDate, the
  // timestamp update-order-status.service.ts sets at the exact moment an
  // order transitions to CLAIMED. Distinct from countByStatus().CLAIMED
  // below, which is an all-time, unscoped count of every order currently
  // sitting in CLAIMED status regardless of when that happened — that
  // figure was previously (incorrectly) reused for "today," which meant a
  // laundry business with zero claims today still saw yesterday's (or last
  // month's) total displayed as "Claimed today."
  async countClaimedInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma): Promise<number> {
    return tx.order.count({
      where: { status: OrderStatus.CLAIMED, isSelfService: false, claimedDate: { gte: range.start, lt: range.end } },
    });
  }

  // Same as countClaimedInRange above, additionally scoped to the staff
  // member who received the order's payment (Order.paidById) — the sale's
  // owner: the creator when paid at drop-off, or the next staff member who
  // collected it on a turned-over order. This is what "my claimed orders
  // today" means for a Staff member: the id is the authorization key, never
  // staffName (which is display-only and not guaranteed unique).
  async countClaimedForUserInRange(
    userId: string,
    range: { start: Date; end: Date },
    tx: PrismaClientOrTx = prisma
  ): Promise<number> {
    return tx.order.count({
      where: { paidById: userId, status: OrderStatus.CLAIMED, isSelfService: false, claimedDate: { gte: range.start, lt: range.end } },
    });
  }

  // Record list backing countClaimedForUserInRange above — same
  // userId+range scope, same listInclude shape as findAll/findById's list
  // variant, so the frontend can reuse its existing Order mapping unchanged.
  async findClaimedForUserInRange(
    userId: string,
    range: { start: Date; end: Date },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.findMany({
      where: { paidById: userId, status: OrderStatus.CLAIMED, isSelfService: false, claimedDate: { gte: range.start, lt: range.end } },
      include: listInclude,
      orderBy: { claimedDate: "desc" },
    });
  }

  // Dashboard: total revenue from every paid, non-cancelled order — now
  // date-scoped via paymentDate when a range is passed (both dashboard
  // services pass getBusinessDayRange() for "today"). Range omitted =
  // all-time, kept for any future caller that genuinely wants that.
  // Independent of Shift Handover's claim status — a sale is revenue
  // whether or not it's been reconciled into a handover yet. userId scopes
  // it to the sales one staff member received payment for (Staff
  // dashboard's "My shift sales"); omitted = shop-wide.
  async sumPaidRevenue(
    range?: { start: Date; end: Date },
    tx: PrismaClientOrTx = prisma,
    userId?: string
  ): Promise<number> {
    const [result, refunds] = await Promise.all([
      tx.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          status: { not: OrderStatus.CANCELLED },
          ...(userId ? { paidById: userId } : {}),
          ...(range ? { paymentDate: { gte: range.start, lt: range.end } } : {}),
        },
        _sum: { totalAmount: true },
      }),
      // Shop-wide (Admin) totals are net of refunds given in the same period
      // (on orders that counted as sales) — taken off on the day of the
      // refund, never the original sale's day. A staff member's own sales
      // never are: refunds are the Admin's, paid from the shop's earnings.
      userId
        ? Promise.resolve({ _sum: { amount: 0 } })
        : tx.refund.aggregate({
            where: {
              order: { status: { not: OrderStatus.CANCELLED } },
              ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
            },
            _sum: { amount: true },
          }),
    ]);
    return Number(result._sum.totalAmount ?? 0) - Number(refunds._sum.amount ?? 0);
  }

  // Every GCash payment the shop has received for an order that counts as a
  // sale (not cancelled) — it lands in the shop's GCash the moment the
  // customer pays, so it's withdrawable right away, open shift or not.
  async sumGcashSales(tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.order.aggregate({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: { not: OrderStatus.CANCELLED },
        paymentMethod: PaymentMethod.GCASH,
      },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  // Shop-wide sales within a period, split by how the customer paid (no
  // recorded method = Cash, as everywhere). Gross — refunds are separate.
  async sumPaidByMethodInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    const rows = await tx.order.groupBy({
      by: ["paymentMethod"],
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: { not: OrderStatus.CANCELLED },
        paymentDate: { gte: range.start, lt: range.end },
      },
      _sum: { totalAmount: true },
    });
    let cash = 0;
    let gcash = 0;
    for (const r of rows) {
      if (r.paymentMethod === PaymentMethod.GCASH) gcash += Number(r._sum.totalAmount ?? 0);
      else cash += Number(r._sum.totalAmount ?? 0);
    }
    return { cash, gcash };
  }

  // Admin dashboard: every paid, non-cancelled order paid within the range —
  // just the fields needed to total sales per day and per payment method.
  async findPaidInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: { not: OrderStatus.CANCELLED },
        paymentDate: { gte: range.start, lt: range.end },
      },
      select: { paymentDate: true, totalAmount: true, paymentMethod: true },
    });
  }

  // Dashboard: order counts by status, for the status-count cards and the
  // "unclaimed orders" figure (everything except CLAIMED/CANCELLED).
  async countByStatus(tx: PrismaClientOrTx = prisma): Promise<Record<OrderStatus, number>> {
    // Workflow counts (Pending/In progress/…) — self-service orders never
    // enter that workflow, so they are left out.
    const grouped = await tx.order.groupBy({
      by: ["status"],
      where: { isSelfService: false },
      _count: { _all: true },
    });
    const counts: Record<OrderStatus, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      READY: 0,
      CLAIMED: 0,
      CANCELLED: 0,
    };
    for (const row of grouped) counts[row.status] = row._count._all;
    return counts;
  }

  // Dashboard: best-selling packages, sourced from real OrderDetail lines
  // (packageId) rather than the frontend's Order.items string-matching —
  // only lines from paid, non-cancelled orders count as an actual sale,
  // matching the "real completed revenue" rule used throughout Shift
  // Handover. Aggregation done in the service layer, same pattern as
  // Shift Handover's summarizeOrders.
  async findPaidPackageLines(tx: PrismaClientOrTx = prisma) {
    return tx.orderDetail.findMany({
      where: {
        packageId: { not: null },
        order: { paymentStatus: PaymentStatus.PAID, status: { not: OrderStatus.CANCELLED } },
      },
      select: { packageId: true, quantity: true },
    });
  }
}
