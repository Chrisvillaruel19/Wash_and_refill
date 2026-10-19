import { prisma } from "../lib/prisma.js";
import { Prisma, PaymentMethod, OrderStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Refunds never move a staff drawer or the GCash available to withdraw — the
// Admin pays them (see refund-order.service.ts). They only matter to sales:
// a refund of a claimed order lowers sales on the day it's given; a
// cancelled order was never a sale, so its refund changes nothing.
const notCancelledOrder = { order: { status: { not: OrderStatus.CANCELLED } } };

export class RefundRepository {
  async create(
    data: { orderId: string; userId: string; amount: number; method: PaymentMethod; reason: string },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.refund.create({ data });
  }

  // Everything refunded so far for one order — a new refund can never take
  // the total past what the customer paid.
  async sumForOrder(orderId: string, tx: PrismaClientOrTx = prisma): Promise<number> {
    const result = await tx.refund.aggregate({ where: { orderId }, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  // Shop-wide sales reports (Admin dashboard chart): refunds given within a
  // period, on orders that counted as sales (not cancelled).
  async findSalesRefundsInRange(range: { start: Date; end: Date }, tx: PrismaClientOrTx = prisma) {
    return tx.refund.findMany({
      where: { createdAt: { gte: range.start, lt: range.end }, ...notCancelledOrder },
      select: { amount: true, method: true, createdAt: true },
    });
  }

  // Shop-wide sales report total: refunds on orders that counted as sales,
  // given within a period (open-ended bounds allowed; none = all time).
  async sumSalesRefunds(
    params: { createdGte?: Date; createdLt?: Date },
    tx: PrismaClientOrTx = prisma
  ): Promise<number> {
    const result = await tx.refund.aggregate({
      where: {
        ...notCancelledOrder,
        ...(params.createdGte || params.createdLt
          ? {
              createdAt: {
                ...(params.createdGte ? { gte: params.createdGte } : {}),
                ...(params.createdLt ? { lt: params.createdLt } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
