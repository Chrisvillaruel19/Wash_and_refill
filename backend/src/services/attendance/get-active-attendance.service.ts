import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "./auto-close.util.js";
import { getActiveShiftBlock } from "./active-shift.util.js";

const attendanceRepository = new AttendanceRepository();

export async function getActiveAttendanceService(userId: string) {
  try {
    await sweepStaleAttendance();
    const record = await attendanceRepository.findActiveForUser(userId);
    // Same rule requireActiveShift enforces on the server, so the Staff
    // portal can show "shift is over" before the user even tries an action.
    const block = record ? await getActiveShiftBlock(userId) : null;

    return {
      code: 200,
      status: "success",
      message: record ? "Active attendance record retrieved" : "No active attendance record",
      data: { attendance: record, handoverSubmitted: block?.handoverSubmitted ?? false },
    };
  } catch (error) {
    console.error("getActiveAttendanceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve active attendance record",
    };
  }
}
