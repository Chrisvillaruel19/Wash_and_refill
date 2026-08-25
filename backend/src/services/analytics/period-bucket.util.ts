export type PeriodGrouping = "day" | "week" | "month";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Monday of the week containing `businessDate` (a UTC-midnight-anchored
// Manila calendar date from getBusinessDateOnly) — plain UTC arithmetic on
// that anchor, no further timezone conversion.
function startOfWeek(businessDate: Date): Date {
  const dayOfWeek = businessDate.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(businessDate);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

// Shared by revenue-trend and expense-analytics — one bucketing rule for
// "what period does this business date belong to," fed a business date
// already produced by getBusinessDateOnly (lib/business-timezone.ts).
export function periodBucketKey(businessDate: Date, groupBy: PeriodGrouping): string {
  if (groupBy === "day") return toIsoDate(businessDate);
  if (groupBy === "week") return toIsoDate(startOfWeek(businessDate));
  return businessDate.toISOString().slice(0, 7); // "YYYY-MM"
}
