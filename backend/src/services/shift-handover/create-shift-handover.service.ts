import { prisma } from "../../lib/prisma.js";
import { CashStatus, AuditAction } from "../../../generated/prisma/client.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { getDrawerStart, summarizeOrders } from "./reconciliation.util.js";
import { NoActiveAttendanceError } from "./shift-handover-errors.js";

const shiftHandoverRepository = new ShiftHandoverRepository();
const orderRepository = new OrderRepository();
const expenseRepository = new ExpenseRepository();
const withdrawalRepository = new WithdrawalRepository();
const attendanceRepository = new AttendanceRepository();

export async function createShiftHandoverService(
  userId: string,
  data: { actualCashCounted: number; notes?: string }
) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Must be the first statement in this transaction, before any other
      // read — including the "harmless-looking" drawerStart read below.
      // Acquiring it late would reopen the exact write-skew race this
      // lock exists to close.
      await acquireDrawerLock(tx);

      // Attendance already represents the start of a work shift; Shift
      // Handover represents its end. startTime comes from there, not from
      // a previous handover — a staff member who never submitted one still
      // has a well-defined shift start. This is independent of, and
      // decoupled from, the reconciliation period claimed below: this
      // handover may reconcile activity from other staff too (one shared
      // drawer), but startTime always honestly means "when the person
      // physically doing this count started their own shift."
      const activeAttendance = await attendanceRepository.findActiveForUser(userId, tx);
      if (!activeAttendance || !activeAttendance.timeIn) {
        throw new NoActiveAttendanceError(
          "No active attendance record found. Clock in before submitting a Shift Handover."
        );
      }

      const startTime = activeAttendance.timeIn;
      const endTime = new Date();

      const drawerStart = await getDrawerStart(tx);

      // The claim step: lock every currently-unclaimed row (across ALL
      // staff — one shared drawer, not a per-staff window) before anyone
      // else can. Postgres re-evaluates "shiftHandoverId IS NULL" after
      // the lock is acquired, so a row already claimed by a just-committed
      // concurrent handover is correctly excluded, never double-claimed.
      const orderIds = await orderRepository.lockUnclaimedPaidIds(tx);
      const expenseIds = await expenseRepository.lockUnclaimedIds(tx);
      const withdrawalIds = await withdrawalRepository.lockUnclaimedIds(tx);

      const orders = await orderRepository.findByIds(orderIds, tx);
      const { laundryEarnings, supplySales, customServiceSales, cashSalesTotal, digitalSalesTotal } =
        summarizeOrders(orders);

      const expenses = await expenseRepository.findByIds(expenseIds, tx);
      const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const withdrawals = await withdrawalRepository.findByIds(withdrawalIds, tx);
      const withdrawalTotal = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

      const expectedBalance = drawerStart + cashSalesTotal - withdrawalTotal - expenseTotal;
      const actualCashCount = data.actualCashCounted;

      const cashStatus =
        actualCashCount === expectedBalance
          ? CashStatus.BALANCED
          : actualCashCount < expectedBalance
          ? CashStatus.SHORTAGE
          : CashStatus.EXCESS;

      const handover = await shiftHandoverRepository.create(
        {
          userId,
          startTime,
          endTime,
          laundryEarnings,
          supplySales,
          customServiceSales,
          digitalSales: digitalSalesTotal,
          expense: expenseTotal,
          withdrawal: withdrawalTotal,
          expectedBalance,
          actualCashCount,
          cashStatus,
          notes: data.notes,
        },
        tx
      );

      // Assign ownership only after the handover itself exists — this is
      // the permanent, queryable audit fact of exactly what this handover
      // reconciled, not a re-derivable inference.
      await orderRepository.claim(orderIds, handover.id, tx);
      await expenseRepository.claim(expenseIds, handover.id, tx);
      await withdrawalRepository.claim(withdrawalIds, handover.id, tx);

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.UPDATE,
        module: "ShiftHandover",
        description: `Submitted shift handover (${cashStatus}, expected ₱${expectedBalance.toFixed(2)}, counted ₱${actualCashCount.toFixed(2)})`,
        newValue: { expectedBalance, actualCashCount, cashStatus },
      });

      return handover;
    });

    return {
      code: 201,
      status: "success",
      message: "Shift handover submitted successfully",
      data: { shiftHandover: created },
    };
  } catch (error) {
    if (error instanceof NoActiveAttendanceError) {
      return { code: 409, status: "error", message: error.message };
    }

    console.error("createShiftHandoverService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to submit shift handover",
    };
  }
}
