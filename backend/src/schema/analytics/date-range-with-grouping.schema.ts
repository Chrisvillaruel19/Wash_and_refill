import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

// Same date-range shape as date-range.schema.ts, plus the trend-bucketing
// granularity for revenue-trend and expense-analytics.
export const dateRangeWithGroupingSchema = z.object({
  query: z
    .object({
      from: isoDate,
      to: isoDate,
      groupBy: z.enum(["day", "week", "month"]).default("day"),
    })
    .refine((q) => q.from <= q.to, {
      message: "'from' must not be after 'to'",
      path: ["to"],
    }),
});
