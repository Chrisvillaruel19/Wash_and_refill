import { prisma } from "../lib/prisma.js";
import { Prisma, OrderStatus, PaymentStatus, PaymentMethod, ServiceType } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Orders can grow large over time (unlike the small catalog tables), so
// list intentionally stays lean — customer info plus just enough of the
// staff member's identity to display who created the order, not the full
// nested line-item tree. getById returns the full detail.
const listInclude = { customer: true, user: { select: { id: true, name: true } } } as const;
const detailInclude = {
  customer: true,
  orderDetails: {
    include: { service: true, package: true, inventory: true },
  },
  consumptions: {
    include: { inventory: true },
  },
} as const;

export class OrderRepository {
  async findAll(tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findUnique({ where: { id }, include: detailInclude });
  }

  async create(
    data: {
      customerId: string;
      userId: string;
      status: OrderStatus;
      paymentMethod?: PaymentMethod;
      paymentStatus: PaymentStatus;
      amountPaid: number;
      totalAmount: number;
      paymentDate: Date | null;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.create({ data });
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

  // Backs both Mark as Paid and Reverse Payment — amountPaid is only ever
  // passed on the Mark as Paid path; omitting it here (Reverse Payment)
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
  // reverse-payment requests on the same order can no longer both succeed:
  // the second one's updateMany matches 0 rows, which the caller treats as
  // a lost race rather than silently double-writing.
  async updatePaymentStatusIfCurrentlyIs(
    id: string,
    expectedStatus: PaymentStatus,
    data: { paymentStatus: PaymentStatus; paymentDate: Date | null; amountPaid?: number },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.order.updateMany({
      where: { id, paymentStatus: expectedStatus },
      data: {
        paymentStatus: data.paymentStatus,
        paymentDate: data.paymentDate,
        ...(data.amountPaid !== undefined ? { amountPaid: data.amountPaid } : {}),
      },
    });
  }

  // Claim-based reconciliation source (global, no userId filter): every
  // currently-unclaimed, paid, non-cancelled order — regardless of who
  // created it. This is a plain read (no FOR UPDATE); it's only ever
  // called by Withdrawal's live balance check or by the caller after it
  // has already locked the specific rows it intends to claim via
  // lockUnclaimedPaidIds below.
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

  // Unreported-activity check for Attendance's clock-out gate: any
  // unclaimed order still eligible for reconciliation. CANCELLED is
  // excluded here for the same reason it's excluded from the reconciliation
  // claim itself (lockUnclaimedPaidIds below) — a cancelled order will
  // never receive a shiftHandoverId under any circumstance, so without this
  // exclusion it would permanently satisfy "unclaimed" and block clock-out
  // forever. Fixed as a targeted production bug (Module 8 regression found
  // during Module 10 verification), not a reconciliation-logic change: the
  // claim queries elsewhere in this file are untouched.
  async findUnclaimedForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      where: { userId, shiftHandoverId: null, status: { not: OrderStatus.CANCELLED } },
    });
  }

  // Dashboard: total revenue from every paid, non-cancelled order —
  // matches the frontend's "todaysSales"/"totalCashToday", which despite
  // the name is deliberately unfiltered by date (the frontend's own
  // computeStatsFromOrders sums every paid order ever stored; there's no
  // real date-boundary logic anywhere in this system yet). Replicated
  // faithfully, not silently "fixed" with date filtering that wasn't asked
  // for. Independent of Shift Handover's claim status — a sale is revenue
  // whether or not it's been reconciled into a handover yet.
  async sumPaidRevenue(tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID, status: { not: OrderStatus.CANCELLED } },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  // Dashboard: order counts by status, for the status-count cards and the
  // "unclaimed orders" figure (everything except CLAIMED/CANCELLED).
  async countByStatus(tx: PrismaClientOrTx = prisma): Promise<Record<OrderStatus, number>> {
    const grouped = await tx.order.groupBy({ by: ["status"], _count: { _all: true } });
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
