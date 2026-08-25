import { prisma } from "../lib/prisma.js";
import { Prisma, AttendanceStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export class AttendanceRepository {
  // Admin scope — every employee's records.
  async findAll(tx: PrismaClientOrTx = prisma) {
    return tx.attendance.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
  }

  // Staff scope — only the authenticated user's own records. Same shape as
  // findAll (still joins User) so the service layer can derive a display
  // name the same way for both scopes, matching ExpenseRepository's
  // findAll/findAllForUser pair.
  async findAllForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.attendance.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
  }

  async findById(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.attendance.findUnique({ where: { id } });
  }

  async findActiveForUser(userId: string, tx: PrismaClientOrTx = prisma) {
    return tx.attendance.findFirst({
      where: { userId, timeOut: null },
      orderBy: { date: "desc" },
    });
  }

  // For the auto-close sweep: any session still open (no timeOut) whose
  // clock-in is older than the caller's cutoff.
  async findOpenSessionsOlderThan(cutoff: Date, tx: PrismaClientOrTx = prisma) {
    return tx.attendance.findMany({ where: { timeOut: null, timeIn: { lt: cutoff } } });
  }

  async create(
    data: { userId: string; date: Date; timeIn: Date; status: AttendanceStatus },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.attendance.create({ data });
  }

  // Shared by both a real clock-out and the auto-close sweep — both are
  // "set timeOut + totalHours (+ optionally flag autoClosed)", just with
  // different inputs for when/how long.
  async closeSession(
    id: string,
    data: { timeOut: Date; totalHours: number; autoClosed?: boolean },
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.attendance.update({ where: { id }, data });
  }
}
