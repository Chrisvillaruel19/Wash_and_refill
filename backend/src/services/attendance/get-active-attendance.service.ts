import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "./auto-close.util.js";

const attendanceRepository = new AttendanceRepository();

export async function getActiveAttendanceService(userId: string) {
  try {
    await sweepStaleAttendance();
    const record = await attendanceRepository.findActiveForUser(userId);

    return {
      code: 200,
      status: "success",
      message: record ? "Active attendance record retrieved" : "No active attendance record",
      data: { attendance: record },
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
