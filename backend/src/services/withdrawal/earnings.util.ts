import { prisma } from "../../lib/prisma.js";
import { Prisma, WithdrawalSource } from "../../../generated/prisma/client.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { getCurrentDrawerBalance, getDrawerStart } from "../shift-handover/reconciliation.util.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const shiftHandoverRepository = new ShiftHandoverRepository();
const withdrawalRepository = new WithdrawalRepository();
const orderRepository = new OrderRepository();
const refundRepository = new RefundRepository();

// All allocation math is done in whole centavos — these are chains of
// floating-point money sums, and splitting one amount across several
// records must add back up exactly.
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

export interface ShiftPortion {
  handoverId: string;
  staffName: string;
  endTime: Date;
  available: number;
}

export interface AvailableToWithdraw {
  // The fixed float — never withdrawable, it stays in the drawer for change.
  startingCash: number;
  cash: {
    // One amount the Admin can take out of the drawer right now.
    total: number;
    // Cash above the starting cash at the last handover's count, minus what
    // was already taken from it. Negative = that count came up short.
    lastShift: ShiftPortion | null;
    // The open shift so far: cash sales − expenses − withdrawals − refunds
    // staff handed out.
    openShift: number;
    // Approved cash refunds staff haven't handed to the customer yet: still
    // in the drawer, but owed — not withdrawable.
    owedRefunds: number;
  };
  gcash: {
    // sales − refunds − withdrawn, never below zero.
    total: number;
    // Every GCash payment received (orders that count as sales).
    sales: number;
    // Claimed-order refunds paid back from the shop's GCash.
    refunds: number;
    // Earnings the Admin already took out.
    withdrawn: number;
  };
}

// Cash: only the LATEST handover's count is used. The drawer is physically
// one box of money: if a shift's earnings aren't taken out, the next shift
// counts them again (as EXCESS), so offering every older shift's
// "counted − float" too would offer the same bills twice. And if that money
// already left the drawer unrecorded, the next count shows it's gone. Either
// way the latest count is the only honest picture of what's in the drawer:
//   drawer now = last count − withdrawn from it + open shift's net cash
//   withdrawable = drawer now − starting cash
// GCash is one running balance, live: a customer's GCash payment is in the
// shop's account the moment they pay (no handover needed), and every GCash
// refund or withdrawal comes off it right away. If refunds ever took it
// below zero, later GCash sales fill that gap first.
export async function getAvailableToWithdraw(tx: PrismaClientOrTx = prisma): Promise<AvailableToWithdraw> {
  const [balance, float, latest, gcashSales, gcashOut, owedRefunds] = await Promise.all([
    getCurrentDrawerBalance(tx),
    getDrawerStart(tx),
    shiftHandoverRepository.findLatestForEarnings(tx),
    orderRepository.sumGcashSales(tx),
    withdrawalRepository.sumGcash(tx),
    refundRepository.sumPendingPayouts(tx),
  ]);

  let lastShift: ShiftPortion | null = null;
  if (latest) {
    const withdrawn = await withdrawalRepository.sumEarningsWithdrawn([latest.id], tx);
    const taken = toCents(
      Number(withdrawn.find((w) => w.source === WithdrawalSource.CASH)?._sum.amount ?? 0)
    );
    const counted = latest.actualCashCount !== null ? Number(latest.actualCashCount) : Number(latest.expectedBalance);
    lastShift = {
      handoverId: latest.id,
      staffName: latest.user.name,
      endTime: latest.endTime,
      available: fromCents(toCents(counted) - toCents(float) - taken),
    };
  }
  // balance already starts from the float (see getCurrentDrawerBalance).
  const openShiftCents = toCents(balance) - toCents(float);
  const cashTotalCents = Math.max(0, toCents(lastShift?.available ?? 0) + openShiftCents - toCents(owedRefunds));

  const gcashCents = toCents(gcashSales) - toCents(gcashOut.refunds) - toCents(gcashOut.earnings);

  return {
    startingCash: float,
    cash: { total: fromCents(cashTotalCents), lastShift, openShift: fromCents(openShiftCents), owedRefunds },
    gcash: {
      total: fromCents(Math.max(0, gcashCents)),
      sales: gcashSales,
      refunds: gcashOut.refunds,
      withdrawn: gcashOut.earnings,
    },
  };
}

// Cash physically in the drawer right now: the starting cash + what the last
// handover counted above it (minus what was withdrawn from that count) + the
// open shift's net cash. Built from the same figures as
// getAvailableToWithdraw, so the two never disagree — but unlike "available
// to withdraw" it keeps the starting cash and doesn't hold back approved
// refunds: it answers "can staff physically hand this cash over?".
export async function getDrawerCashOnHand(tx: PrismaClientOrTx = prisma): Promise<number> {
  const available = await getAvailableToWithdraw(tx);
  return fromCents(
    toCents(available.startingCash) +
      toCents(available.cash.lastShift?.available ?? 0) +
      toCents(available.cash.openShift)
  );
}

// One withdrawal record to create: a slice of a closed shift's earnings
// (handoverId set) or of the open shift's drawer / the GCash balance
// (handoverId null).
export interface WithdrawalSlice {
  handoverId: string | null;
  amount: number;
}

// Splits one requested Cash amount into per-shift records so every peso
// stays traceable to the shift it came from: the last count's leftover first
// (its earnings are what's been sitting in the drawer longest), then the open
// shift's drawer. GCash is one balance, so it's always a single record. The
// caller must already have checked amount <= the source's total.
export function splitWithdrawal(
  available: AvailableToWithdraw,
  source: WithdrawalSource,
  amount: number
): WithdrawalSlice[] {
  if (source === WithdrawalSource.GCASH) return [{ handoverId: null, amount }];

  let remaining = toCents(amount);
  const slices: WithdrawalSlice[] = [];
  const last = available.cash.lastShift;
  const fromLast = last ? Math.min(remaining, Math.max(0, toCents(last.available))) : 0;
  if (last && fromLast > 0) {
    slices.push({ handoverId: last.handoverId, amount: fromCents(fromLast) });
    remaining -= fromLast;
  }
  if (remaining > 0) slices.push({ handoverId: null, amount: fromCents(remaining) });
  return slices;
}
