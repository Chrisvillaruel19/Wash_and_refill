import { prisma } from "../../lib/prisma.js";
import { Prisma, PaymentMethod } from "../../../generated/prisma/client.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const shiftHandoverRepository = new ShiftHandoverRepository();
const orderRepository = new OrderRepository();
const expenseRepository = new ExpenseRepository();
const withdrawalRepository = new WithdrawalRepository();

// Matches the frontend's FALLBACK_CASH_DRAWER_START — before any handover
// has ever been submitted, the drawer's starting float is this constant.
const FALLBACK_CASH_DRAWER_START = 5000;

// The drawer's starting balance for a new reconciliation: the most recent
// handover's physically-counted total, or the fallback if none exist yet.
// Safe to read here without its own lock because every caller of this
// function has already acquired the DrawerState lock first — see
// drawer-lock.ts. This function does not enforce that; it trusts it.
export async function getDrawerStart(tx: PrismaClientOrTx = prisma): Promise<number> {
  const mostRecent = await shiftHandoverRepository.findMostRecent(tx);
  return mostRecent ? Number(mostRecent.actualCashCount) : FALLBACK_CASH_DRAWER_START;
}

type UnclaimedOrder = Awaited<ReturnType<OrderRepository["findUnclaimedPaid"]>>[number];

// Category breakdown sourced from real OrderDetail line types (Package /
// Service / Inventory) — a more accurate replacement for the frontend's
// name-matching + residual "custom service sales" calculation, now possible
// because the backend actually models these as distinct relations.
export function summarizeOrders(orders: UnclaimedOrder[]) {
  let laundryEarnings = 0;
  let supplySales = 0;
  let customServiceSales = 0;
  let cashSalesTotal = 0;
  let totalSales = 0;

  for (const order of orders) {
    for (const detail of order.orderDetails) {
      const subtotal = Number(detail.subtotal);
      if (detail.packageId) laundryEarnings += subtotal;
      else if (detail.inventoryId) supplySales += subtotal;
      else if (detail.serviceId) customServiceSales += subtotal;
    }

    const orderTotal = Number(order.totalAmount);
    totalSales += orderTotal;
    if ((order.paymentMethod ?? PaymentMethod.CASH) === PaymentMethod.CASH) {
      cashSalesTotal += orderTotal;
    }
  }

  return {
    laundryEarnings,
    supplySales,
    customServiceSales,
    cashSalesTotal,
    totalSales,
    digitalSalesTotal: totalSales - cashSalesTotal,
  };
}

// Live "how much cash is in the drawer right now" — the drawer's starting
// balance plus every currently-unclaimed cash sale, minus every
// currently-unclaimed expense and withdrawal. Global (no userId), since a
// withdrawal isn't tied to any one staff member's shift. This is a plain
// read, not a claim — the caller must already hold the DrawerState lock
// (acquired via acquireDrawerLock) before calling this, so no concurrent
// handover/withdrawal can be mutating these totals underneath it.
export async function getCurrentDrawerBalance(tx: PrismaClientOrTx = prisma): Promise<number> {
  const drawerStart = await getDrawerStart(tx);

  const orders = await orderRepository.findUnclaimedPaid(tx);
  const { cashSalesTotal } = summarizeOrders(orders);

  const expenses = await expenseRepository.findUnclaimed(tx);
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const withdrawals = await withdrawalRepository.findUnclaimed(tx);
  const withdrawalTotal = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  return drawerStart + cashSalesTotal - expenseTotal - withdrawalTotal;
}

// Unreported-activity check for Attendance's clock-out gate: does this
// staff member have any order or expense not yet claimed by any handover?
// Claim-status based, not timestamp based — no "since" cutoff needed.
export async function getUnreportedActivity(userId: string, tx: PrismaClientOrTx = prisma) {
  const orders = await orderRepository.findUnclaimedForUser(userId, tx);
  const expenses = await expenseRepository.findUnclaimedForUser(userId, tx);
  return { orders, expenses };
}
