import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export type CustomerSort = "recent" | "visits" | "spent" | "name";
// "regular" = came back 2+ times (not counting cancelled orders).
export type CustomerFilter = "all" | "regular";

// ORDER BY per sort — a fixed whitelist, never built from user input.
const ORDER_BY: Record<CustomerSort, Prisma.Sql> = {
  recent: Prisma.sql`"lastVisit" DESC NULLS LAST, name ASC`,
  visits: Prisma.sql`visits DESC, "lastVisit" DESC NULLS LAST`,
  spent: Prisma.sql`spent DESC, "lastVisit" DESC NULLS LAST`,
  name: Prisma.sql`lower(name) ASC`,
};

export interface CustomerSummaryRow {
  id: string;
  name: string;
  phoneNumber: string | null;
  visits: number;
  spent: number;
  refunded: number;
  firstVisit: Date | null;
  lastVisit: Date | null;
  total: number;
}

// Customer list with per-customer totals, computed in one query:
//  - name     = the name on their most recent order (each order keeps the
//               name typed for it), falling back to the customer record;
//  - visits   = orders that weren't cancelled;
//  - spent    = paid orders that weren't cancelled, minus refunds on them —
//               what the customer actually paid the shop;
//  - refunded = refunds on those orders (cancelled-order refunds excluded:
//               those were never sales).
export class CustomerCrmRepository {
  async findSummaries(
    params: { search?: string; sort: CustomerSort; filter?: CustomerFilter; page: number; pageSize: number },
    tx: PrismaClientOrTx = prisma
  ): Promise<CustomerSummaryRow[]> {
    const term = params.search?.trim();
    const like = term ? `%${term}%` : null;
    const regularsOnly = params.filter === "regular";
    const rows = await tx.$queryRaw<
      (Omit<CustomerSummaryRow, "visits" | "spent" | "refunded" | "total"> & {
        visits: bigint;
        spent: Prisma.Decimal;
        refunded: Prisma.Decimal;
        total: bigint;
      })[]
    >`
      WITH stats AS (
        SELECT
          c.id,
          COALESCE(
            (SELECT o2."customerName" FROM "Order" o2 WHERE o2."customerId" = c.id ORDER BY o2."createdAt" DESC LIMIT 1),
            c."customerName"
          ) AS name,
          c."phoneNumber",
          COUNT(o.id) FILTER (WHERE o.status <> 'CANCELLED') AS visits,
          COALESCE(SUM(o."totalAmount") FILTER (WHERE o."paymentStatus" = 'PAID' AND o.status <> 'CANCELLED'), 0) AS paid,
          COALESCE((
            SELECT SUM(r.amount) FROM "Refund" r JOIN "Order" ro ON ro.id = r."orderId"
            WHERE ro."customerId" = c.id AND ro.status <> 'CANCELLED'
          ), 0) AS refunded,
          -- A cancelled order isn't a visit.
          MIN(o."createdAt") FILTER (WHERE o.status <> 'CANCELLED') AS "firstVisit",
          MAX(o."createdAt") FILTER (WHERE o.status <> 'CANCELLED') AS "lastVisit"
        FROM "Customer" c
        LEFT JOIN "Order" o ON o."customerId" = c.id
        GROUP BY c.id
      )
      SELECT id, name, "phoneNumber", visits, paid - refunded AS spent, refunded,
             "firstVisit", "lastVisit", COUNT(*) OVER () AS total
      FROM stats
      WHERE (${regularsOnly}::boolean = false OR visits >= 2)
        AND (
          ${like}::text IS NULL
          OR name ILIKE ${like}
          OR "phoneNumber" ILIKE ${like}
          OR EXISTS (SELECT 1 FROM "Order" so WHERE so."customerId" = stats.id AND so."customerName" ILIKE ${like})
        )
      ORDER BY ${ORDER_BY[params.sort]}
      LIMIT ${params.pageSize} OFFSET ${(params.page - 1) * params.pageSize}
    `;
    return rows.map((r) => ({
      ...r,
      visits: Number(r.visits),
      spent: Number(r.spent),
      refunded: Number(r.refunded),
      total: Number(r.total),
    }));
  }

  // Headline numbers for the Customers page: how many customers, how many
  // came back (2+ visits), how many first came this month (Manila time),
  // and what they paid in total (paid, not cancelled, minus refunds).
  async getOverview(tx: PrismaClientOrTx = prisma) {
    const [row] = await tx.$queryRaw<
      { customers: bigint; regulars: bigint; newThisMonth: bigint; spent: Prisma.Decimal }[]
    >`
      WITH per AS (
        SELECT c.id,
          COUNT(o.id) FILTER (WHERE o.status <> 'CANCELLED') AS visits,
          MIN(o."createdAt") FILTER (WHERE o.status <> 'CANCELLED') AS first_visit
        FROM "Customer" c
        LEFT JOIN "Order" o ON o."customerId" = c.id
        GROUP BY c.id
      )
      SELECT
        COUNT(*) AS customers,
        COUNT(*) FILTER (WHERE visits >= 2) AS regulars,
        COUNT(*) FILTER (
          WHERE first_visit >= (date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
        ) AS "newThisMonth",
        (
          COALESCE((SELECT SUM("totalAmount") FROM "Order" WHERE "paymentStatus" = 'PAID' AND status <> 'CANCELLED'), 0)
          - COALESCE((SELECT SUM(r.amount) FROM "Refund" r JOIN "Order" o ON o.id = r."orderId" WHERE o.status <> 'CANCELLED'), 0)
        ) AS spent
      FROM per
    `;
    return {
      customers: Number(row.customers),
      regulars: Number(row.regulars),
      newThisMonth: Number(row.newThisMonth),
      spent: Number(row.spent),
    };
  }

  // One customer's orders (newest first) with what was refunded on each.
  async findOrders(customerId: string, tx: PrismaClientOrTx = prisma) {
    return tx.order.findMany({
      where: { customerId },
      select: {
        id: true,
        customerName: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        isSelfService: true,
        createdAt: true,
        user: { select: { name: true } },
        refunds: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

}
