import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { getShiftStartingCash } from "./reconciliation.util.js";

const withdrawalRepository = new WithdrawalRepository();
const refundRepository = new RefundRepository();
const expenseRepository = new ExpenseRepository();
const shiftHandoverRepository = new ShiftHandoverRepository();

const sum = (rows: { amount: unknown }[]) =>
  rows.reduce((total, r) => total + Math.round(Number(r.amount) * 100), 0) / 100;

// Everything that took cash out of the drawer since the last handover, other
// than expenses: Admin withdrawals, and cash refunds staff handed to
// customers. Staff see it so the expected cash on their Shift Handover
// matches what's really in the drawer before they count — the server
// subtracts the same amounts on submit. Also lists approved refunds still
// waiting to be handed over (not subtracted: that cash is still there).
export async function getPendingWithdrawalsService() {
  try {
    const latest = await shiftHandoverRepository.findLatestForEarnings();
    const [withdrawals, refundsPaid, refundsToGive, expenses, starting, gcashRefunds] = await Promise.all([
      withdrawalRepository.findUnclaimed(),
      refundRepository.findUnclaimedPayouts(),
      refundRepository.findPendingPayouts(),
      expenseRepository.findUnclaimed(),
      getShiftStartingCash(),
      refundRepository.findUnclaimedGcashRefunds(latest?.endTime ?? null),
    ]);
    return {
      code: 200,
      status: "success",
      message: "Pending withdrawals retrieved successfully",
      data: {
        total: sum(withdrawals),
        withdrawals: withdrawals.map((w) => ({
          id: w.id,
          amount: Number(w.amount),
          reason: w.reason,
          withdrawalDate: w.withdrawalDate,
        })),
        refundsPaidTotal: sum(refundsPaid),
        refundsPaid: refundsPaid.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          reason: r.reason,
          customerName: r.order.customerName,
          paidOutAt: r.paidOutAt,
          paidOutBy: r.paidOutBy?.name ?? "",
        })),
        refundsToGiveTotal: sum(refundsToGive),
        // Every expense paid from the shared drawer since the last handover
        // (any staff) — what the server subtracts on submit.
        expensesTotal: sum(expenses),
        // What the drawer held when this shift started (the server uses the
        // same figure on submit): the starting cash, plus sales not yet
        // withdrawn, or minus what a refund/expense used of it.
        startingCash: starting.startingCash,
        startingCashFloat: starting.float,
        startingCashCarriedOver: starting.carriedOver,
        // GCash refunds since the last handover — this shift's GCash is
        // shown after them. Never part of the drawer math.
        gcashRefundsTotal: sum(gcashRefunds),
        gcashRefunds: gcashRefunds.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          reason: r.reason,
          customerName: r.order.customerName,
          createdAt: r.createdAt,
        })),
      },
    };
  } catch (error) {
    console.error("getPendingWithdrawalsService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve pending withdrawals" };
  }
}
