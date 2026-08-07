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

// UTC midnight of the business-local calendar date for the given instant —
// stable under Postgres's UTC-based DATE serialization no matter what
// timezone the Node process itself is running in.
export function getBusinessDateOnly(instant: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}
