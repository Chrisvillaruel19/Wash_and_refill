import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "./auto-close.util.js";

const attendanceRepository = new AttendanceRepository();

export async function listAttendanceService() {
  try {
    await sweepStaleAttendance();
    const records = await attendanceRepository.findAll();

    return {
      code: 200,
      status: "success",
      message: "Attendance records retrieved successfully",
      data: { records },
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
