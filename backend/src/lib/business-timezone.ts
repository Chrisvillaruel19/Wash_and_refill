// Wash & Refill operates in the Philippines — Attendance's "date" column
// must reflect THAT timezone's calendar day, regardless of which timezone
// the Node process itself happens to be running under (dev machines, CI,
// and cloud hosts can all differ, and most cloud hosts default containers
// to UTC). Deriving "today" from ambient `new Date().getFullYear()/
// getMonth()/getDate()` is not safe: those getters return the SERVER
// PROCESS's local time, and constructing a Date from local-midnight y/m/d
// then round-tripping it through Postgres's UTC-based DATE-column
// serialization silently shifts the stored calendar date backward by a day
// on any host timezone ahead of UTC (reproduced live in this environment,
// which runs UTC+8) — a staff member clocking in on a real Philippine
// "Tuesday" could have their attendance permanently recorded as "Monday."
const BUSINESS_TIMEZONE = "Asia/Manila";
// Fixed, no DST — Philippine Standard Time has been UTC+8 year-round since
// 1978. Safe to hardcode rather than re-derive per call.
const BUSINESS_UTC_OFFSET_HOURS = 8;

// Shared by both functions below — the one place that actually asks the
// platform "what calendar date is it in Manila for this instant." Do not
// duplicate this Intl call elsewhere; extend this file instead.
function getManilaDateParts(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

// UTC midnight of the business-local calendar date for the given instant —
// stable under Postgres's UTC-based DATE serialization no matter what
// timezone the Node process itself is running in.
export function getBusinessDateOnly(instant: Date = new Date()): Date {
  const { year, month, day } = getManilaDateParts(instant);
  return new Date(Date.UTC(year, month - 1, day));
}

// Real UTC instant bounds of the Manila calendar day containing `instant` —
// for filtering a DateTime column (e.g. Order.paymentDate) to "this business
// day," not for writing to a DATE column (use getBusinessDateOnly for that).
// Deliberately distinct from getBusinessDateOnly's return value: that one is
// a UTC-midnight anchor for DATE storage, not the actual instant Manila's
// day starts (which is 8 hours earlier — Manila midnight = 16:00 UTC the
// previous day). `end` is exclusive, so callers filter with
// `gte: start, lt: end`.
export function getBusinessDayRange(instant: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getManilaDateParts(instant);
  return {
    start: new Date(Date.UTC(year, month - 1, day, -BUSINESS_UTC_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, month - 1, day + 1, -BUSINESS_UTC_OFFSET_HOURS)),
  };
}
