import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "./auto-close.util.js";
import { AccountStatus, Role } from "../../../generated/prisma/client.js";
import { getBusinessDateOnly } from "../../lib/business-timezone.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { getAttendanceStatus } from "./attendance-status.util.js";

const attendanceRepository = new AttendanceRepository();
const userRepository = new UserRepository();

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

    const normalizedRecords = records.map((record) => ({
      ...record,
      status: record.timeIn ? getAttendanceStatus(record.timeIn) : record.status,
    }));

    const hasAttendanceToday = records.some((record) => record.date.getTime() === getBusinessDateOnly().getTime());

    if (role === Role.ADMIN && hasAttendanceToday) {
      const today = getBusinessDateOnly();
      const activeStaff = await userRepository.findAllStaff(AccountStatus.ACTIVE);
      const clockedInToday = new Set(
        records
          .filter((record) => record.date.getTime() === today.getTime())
          .map((record) => record.userId)
      );

      const absentRecords = activeStaff
        .filter((staff) => !clockedInToday.has(staff.id))
        .map((staff) => ({
          id: `absent-${staff.id}-${today.toISOString().slice(0, 10)}`,
          userId: staff.id,
          date: today,
          timeIn: null,
          timeOut: null,
          totalHours: null,
          autoClosed: false,
          status: "ABSENT" as const,
          user: { id: staff.id, name: staff.name },
        }));

      normalizedRecords.push(...absentRecords);
      normalizedRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return {
      code: 200,
      status: "success",
      message: "Attendance records retrieved successfully",
      data: { records: normalizedRecords },
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
