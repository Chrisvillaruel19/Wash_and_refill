import { z } from "zod";

// Kept as a plain "YYYY-MM-DD" string, not z.coerce.date() — the service
// resolves it against the Manila business day via getBusinessDayRangeForDate
// (business-timezone.ts), which needs the calendar date as given, not a
// Date already (mis)anchored to UTC midnight by naive coercion.
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date as YYYY-MM-DD");

// Either scope by an already-claimed shift, or by a payment-date range
// (both ends optional — omitted entirely means "all time"). The controller
// is responsible for not passing a shiftHandoverId alongside a date range;
// this schema only validates the shape of whichever params are present.
export const getSalesBreakdownSchema = z.object({
  query: z.object({
    shiftHandoverId: z.string().uuid().optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
  }),
});
