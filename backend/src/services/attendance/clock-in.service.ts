import { prisma } from "../../lib/prisma.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { Prisma, AttendanceStatus, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const attendanceRepository = new AttendanceRepository();

export async function clockInService(userId: string) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // Date-only, matching the column's @db.Date type and the
      // @@unique([userId, date]) constraint this relies on.
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const record = await attendanceRepository.create(
        { userId, date: today, timeIn: now, status: AttendanceStatus.PRESENT },
        tx
      );

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "Attendance",
        description: "Clocked in",
        newValue: { date: today, timeIn: now },
      });

      return record;
    });

    return {
      code: 201,
      status: "success",
      message: "Clocked in successfully",
      data: { attendance: created },
    };
  } catch (error) {
    // Unique-constraint violation on (userId, date) — this is a CREATE-time
    // engine-level error, which does surface as the classic
    // PrismaClientKnownRequestError shape (verified in Customer/Orders;
    // unlike the driver-adapter RESTRICT-on-delete error shape).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        code: 409,
        status: "error",
        message: "Already clocked in today",
      };
    }

    console.error("clockInService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to clock in",
    };
  }
}
