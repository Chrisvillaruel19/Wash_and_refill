import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export type CustomerSort = "recent" | "visits" | "name";
// "regular" = REGULAR_MIN_VISITS+ visits (cancelled orders don't count).
export type CustomerFilter = "all" | "regular";

// How many completed visits make a customer a Regular. The Customers page
// uses the same number (frontend REGULAR_MIN_VISITS).
export const REGULAR_MIN_VISITS = 5;

// ORDER BY per sort — a fixed whitelist, never built from user input. Each
// ends on the customer id so ties (same name, no visits yet…) keep one fixed
// order and paging never repeats or skips a customer.
const ORDER_BY: Record<CustomerSort, Prisma.Sql> = {
  recent: Prisma.sql`"lastVisit" DESC NULLS LAST, lower(name) ASC, id ASC`,
  visits: Prisma.sql`visits DESC, "lastVisit" DESC NULLS LAST, id ASC`,
  name: Prisma.sql`lower(name) ASC, id ASC`,
};

export interface CustomerSummaryRow {
  id: string;
  name: string;
  phoneNumber: string | null;
  visits: number;
  firstVisit: Date | null;
  lastVisit: Date | null;
}

// A search term as a literal ILIKE pattern: % and _ match themselves, not
// "anything".
function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}

// Customer list, one query:
//  - name     = the name saved when they first ordered (a returning phone
//               number never overwrites it; each order keeps the name
//               typed for it, shown in their order history);
//  - visits   = orders that weren't cancelled;
//  - first/last visit = from those same orders.
// Search matches any name used on their orders, or the phone number — typed
// with or without the spaces the page shows ("0917 123" finds 09171234567).
export class CustomerCrmRepository {
  async findSummaries(
    params: { search?: string; sort: CustomerSort; filter?: CustomerFilter; page: number; pageSize: number },
    tx: PrismaClientOrTx = prisma
  ): Promise<{ rows: CustomerSummaryRow[]; total: number }> {
    const term = params.search?.trim();
    const like = term ? likePattern(term) : null;
    const digits = term ? term.replace(/\D/g, "") : "";
    const phoneLike = digits ? `%${digits}%` : null;
    const regularsOnly = params.filter === "regular";
    const filtered = Prisma.sql`
      WITH stats AS (
        SELECT
          c.id,
          c."customerName" AS name,
          c."phoneNumber",
          COUNT(o.id) FILTER (WHERE o.status <> 'CANCELLED') AS visits,
          -- A cancelled order isn't a visit.
          MIN(o."createdAt") FILTER (WHERE o.status <> 'CANCELLED') AS "firstVisit",
          MAX(o."createdAt") FILTER (WHERE o.status <> 'CANCELLED') AS "lastVisit"
        FROM "Customer" c
        LEFT JOIN "Order" o ON o."customerId" = c.id
        GROUP BY c.id
      )
      SELECT id, name, "phoneNumber", visits, "firstVisit", "lastVisit"
      FROM stats
      WHERE (${regularsOnly}::boolean = false OR visits >= ${REGULAR_MIN_VISITS})
        AND (
          ${like}::text IS NULL
          OR name ILIKE ${like}
          OR (${phoneLike}::text IS NOT NULL AND "phoneNumber" LIKE ${phoneLike})
          OR EXISTS (SELECT 1 FROM "Order" so WHERE so."customerId" = stats.id AND so."customerName" ILIKE ${like})
        )
    `;
    const [rows, count] = await Promise.all([
      tx.$queryRaw<(Omit<CustomerSummaryRow, "visits"> & { visits: bigint })[]>`
        ${filtered}
        ORDER BY ${ORDER_BY[params.sort]}
        LIMIT ${params.pageSize} OFFSET ${(params.page - 1) * params.pageSize}
      `,
      // Counted on its own, so a page past the end still reports the real total.
      tx.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM (${filtered}) f`,
    ]);
    return {
      rows: rows.map((r) => ({ ...r, visits: Number(r.visits) })),
      total: Number(count[0]?.n ?? 0),
    };
  }

  // Headline numbers for the Customers page: how many customers, how many
  // are Regulars (REGULAR_MIN_VISITS+ visits), and how many first came this
  // month (Manila time).
  async getOverview(tx: PrismaClientOrTx = prisma) {
    const [row] = await tx.$queryRaw<
      { customers: bigint; regulars: bigint; newThisMonth: bigint }[]
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
        COUNT(*) FILTER (WHERE visits >= ${REGULAR_MIN_VISITS}) AS regulars,
        COUNT(*) FILTER (
          WHERE first_visit >= (date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
        ) AS "newThisMonth"
      FROM per
    `;
    return {
      customers: Number(row.customers),
      regulars: Number(row.regulars),
      newThisMonth: Number(row.newThisMonth),
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
