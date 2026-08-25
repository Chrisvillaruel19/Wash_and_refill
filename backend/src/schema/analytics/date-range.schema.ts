import { z } from "zod";

// Manila calendar dates (YYYY-MM-DD), inclusive on both ends — the
// controller converts these into real UTC instant bounds via
// getBusinessDayRange, the same Asia/Manila logic used everywhere else in
// this codebase. Shared by every analytics endpoint that just needs a
// period, no grouping.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

export const dateRangeSchema = z.object({
  query: z
    .object({
      from: isoDate,
      to: isoDate,
    })
    .refine((q) => q.from <= q.to, {
      message: "'from' must not be after 'to'",
      path: ["to"],
    }),
});
