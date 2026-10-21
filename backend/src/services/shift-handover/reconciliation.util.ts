import { prisma } from "../../lib/prisma.js";
import { Prisma, PaymentMethod, OrderStatus, WithdrawalSource } from "../../../generated/prisma/client.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { DrawerStateRepository } from "../../repositories/drawer-state.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const orderRepository = new OrderRepository();
const expenseRepository = new ExpenseRepository();
const withdrawalRepository = new WithdrawalRepository();
const drawerStateRepository = new DrawerStateRepository();
const refundRepository = new RefundRepository();
const shiftHandoverRepository = new ShiftHandoverRepository();

// The drawer's starting balance for a new reconciliation: always the
// Admin-configured fixed cash float (DrawerState.defaultStartingCash),
// never the previous handover's actualCashCount. The shop operates on a
// fixed-float model — the shift's earnings/excess are remitted out via
// Withdrawal, and only the float itself remains in the drawer for the next
// shift. Carrying forward the previous actualCashCount would let cash
// silently accumulate whenever remittance is skipped or partial; reading
// the configured float here every time makes that impossible and correctly
// surfaces any un-remitted excess as EXCESS on the next handover instead.
// Safe to read here without its own lock because every caller of this
// function has already acquired the DrawerState lock first — see
// drawer-lock.ts. This function does not enforce that; it trusts it.
export async function getDrawerStart(tx: PrismaClientOrTx = prisma): Promise<number> {
  const drawerState = await drawerStateRepository.get(tx);
  return Number(drawerState.defaultStartingCash);
}

// What the drawer really holds when a new shift starts — the starting point
// of that shift's expected cash: the last handover's count minus the sales
// the Admin has withdrawn from it since. Equals the starting cash when the
// Admin took out every peso of sales; more when some weren't withdrawn yet;
// less when a refund or expense used part of the starting cash (new cash
// sales fill that back first — see getAvailableToWithdraw). The first
// handover ever starts from the starting cash. Only the handover uses this:
// the starting cash itself (getDrawerStart) stays the fixed amount that is
// never withdrawable.
export async function getShiftStartingCash(
  tx: PrismaClientOrTx = prisma
): Promise<{ startingCash: number; float: number; carriedOver: number }> {
  const [float, latest] = await Promise.all([getDrawerStart(tx), shiftHandoverRepository.findLatestForEarnings(tx)]);
  if (!latest) return { startingCash: float, float, carriedOver: 0 };

  const withdrawn = await withdrawalRepository.sumEarningsWithdrawn([latest.id], tx);
  const takenCents = Math.round(
    Number(withdrawn.find((w) => w.source === WithdrawalSource.CASH)?._sum.amount ?? 0) * 100
  );
  const counted = latest.actualCashCount !== null ? Number(latest.actualCashCount) : Number(latest.expectedBalance);
  const startingCents = Math.round(counted * 100) - takenCents;
  return {
    startingCash: startingCents / 100,
    float,
    carriedOver: (startingCents - Math.round(float * 100)) / 100,
  };
}

type UnclaimedOrder = Awaited<ReturnType<OrderRepository["findUnclaimedPaid"]>>[number];

// Category breakdown sourced from real OrderDetail line types (Package /
// Service / Inventory) — a more accurate replacement for the frontend's
// name-matching + residual "custom service sales" calculation, now possible
// because the backend actually models these as distinct relations.
//
// Callers pass orders that aren't cancelled (findUnclaimedPaid / the
// handover claim exclude them: a cancelled order's cash is taken out of the
// drawer and set aside for its refund). The cancelled check below is only a
// safety net so no figure can ever count one.
export function summarizeOrders(orders: UnclaimedOrder[]) {
  let laundryEarnings = 0;
  let supplySales = 0;
  let customServiceSales = 0;
  let cashSalesTotal = 0;
  let digitalSalesTotal = 0;
  let totalSales = 0;

  for (const order of orders) {
    if (order.status === OrderStatus.CANCELLED) continue;

    const orderTotal = Number(order.totalAmount);
    if ((order.paymentMethod ?? PaymentMethod.CASH) === PaymentMethod.CASH) cashSalesTotal += orderTotal;
    else digitalSalesTotal += orderTotal;

    for (const detail of order.orderDetails) {
      const subtotal = Number(detail.subtotal);
      if (detail.packageId) laundryEarnings += subtotal;
      else if (detail.inventoryId) supplySales += subtotal;
      else if (detail.serviceId) customServiceSales += subtotal;
    }
    totalSales += orderTotal;
  }

  return {
    laundryEarnings,
    supplySales,
    customServiceSales,
    cashSalesTotal,
    totalSales,
    digitalSalesTotal,
  };
}

// Live "how much cash is in the drawer right now" — the drawer's starting
// balance plus every currently-unclaimed cash sale, minus every
// currently-unclaimed expense, cash withdrawal (GCash ones never touch the
// drawer) and cash refund a staff member handed to a customer (see
// pay-out-refund.service.ts). Global (no userId), since a
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

  const refundsPaidTotal = await refundRepository.sumUnclaimedPayouts(tx);

  return drawerStart + cashSalesTotal - expenseTotal - withdrawalTotal - refundsPaidTotal;
}

// Unreported-activity check for Attendance's clock-out gate: does this
// staff member have any order, expense or refund payout not yet claimed by
// any handover? Claim-status based, not timestamp based — no "since" cutoff
// needed.
export async function getUnreportedActivity(userId: string, tx: PrismaClientOrTx = prisma) {
  const orders = await orderRepository.findUnclaimedForUser(userId, tx);
  const expenses = await expenseRepository.findUnclaimedForUser(userId, tx);
  const refundPayouts = await refundRepository.findUnclaimedPayoutsForUser(userId, tx);
  return { orders, expenses, refundPayouts };
}
