import { AttendanceStatus } from "../../../generated/prisma/client.js";

const SHIFT_START_SECONDS = 8 * 60 * 60;

export function getAttendanceStatus(timeIn: Date): AttendanceStatus {
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timeIn);
  const hour = Number(timeParts.find((part) => part.type === "hour")?.value);
  const minute = Number(timeParts.find((part) => part.type === "minute")?.value);
  const second = Number(timeParts.find((part) => part.type === "second")?.value);
  const secondsAfterMidnight = hour * 60 * 60 + minute * 60 + second;

  return secondsAfterMidnight > SHIFT_START_SECONDS
    ? AttendanceStatus.LATE
    : AttendanceStatus.PRESENT;
}