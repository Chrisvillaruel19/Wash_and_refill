import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "./auto-close.util.js";
import { computeAbsentDates } from "./shift-schedule.util.js";
import { Role } from "../../../generated/prisma/client.js";

const attendanceRepository = new AttendanceRepository();

// Scope is a business rule, not a route gate: Admin sees every employee's
// attendance, Staff sees only their own — same pattern as
// listExpensesService. Both hit the same GET /attendance endpoint.
export async function listAttendanceService(userId: string, role?: Role) {
  try {
    await sweepStaleAttendance();
    const records =
      role === Role.ADMIN
        ? await attendanceRepository.findAll()
        : await attendanceRepository.findAllForUser(userId);

    // Admin only — an absent day belongs to the shop, not to whichever
    // Staff member is asking (see computeAbsentDates).
    const absentDates = role === Role.ADMIN ? computeAbsentDates(records.map((r) => r.date)) : [];

    return {
      code: 200,
      status: "success",
      message: "Attendance records retrieved successfully",
      data: { records, absentDates },
    };
  } catch (error) {
    console.error("listAttendanceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve attendance records",
    };
  }
}
