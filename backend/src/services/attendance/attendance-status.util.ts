import { AttendanceStatus } from "../../../generated/prisma/client.js";

const LATE_HOUR = 9;

export function getAttendanceStatus(timeIn: Date): AttendanceStatus {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(timeIn)
  );

  return hour >= LATE_HOUR ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
}