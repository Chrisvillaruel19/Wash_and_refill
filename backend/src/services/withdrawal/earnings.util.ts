import { prisma } from "../../lib/prisma.js";
import { Prisma, WithdrawalSource } from "../../../generated/prisma/client.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { getCurrentDrawerBalance, getDrawerStart } from "../shift-handover/reconciliation.util.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const shiftHandoverRepository = new ShiftHandoverRepository();
const withdrawalRepository = new WithdrawalRepository();

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
    // The open shift so far: cash sales − expenses − withdrawals.
    openShift: number;
  };
  gcash: {
    total: number;
    // Closed shifts with GCash still not withdrawn, oldest first.
    shifts: ShiftPortion[];
  };
}

// Only the LATEST handover's count is used for cash. The drawer is
// physically one box of money: if a shift's earnings aren't taken out, the
// next shift counts them again (as EXCESS), so offering every older shift's
// "counted − float" too would offer the same bills twice. And if that money
// already left the drawer unrecorded, the next count shows it's gone. Either
// way the latest count is the only honest picture of what's in the drawer:
//   drawer now = last count − withdrawn from it + open shift's net cash
//   withdrawable = drawer now − starting cash
// GCash is different: it's never counted into the drawer, so each closed
// shift's GCash sales stay withdrawable until taken.
export async function getAvailableToWithdraw(tx: PrismaClientOrTx = prisma): Promise<AvailableToWithdraw> {
  const [balance, float, latest, gcashHandovers] = await Promise.all([
    getCurrentDrawerBalance(tx),
    getDrawerStart(tx),
    shiftHandoverRepository.findLatestForEarnings(tx),
    shiftHandoverRepository.findWithGcashSales(tx),
  ]);

  const ids = [...new Set([...(latest ? [latest.id] : []), ...gcashHandovers.map((h) => h.id)])];
  const withdrawn = await withdrawalRepository.sumEarningsWithdrawn(ids, tx);
  const takenCents = (id: string, source: WithdrawalSource) =>
    toCents(Number(withdrawn.find((w) => w.earningsFromHandoverId === id && w.source === source)?._sum.amount ?? 0));

  let lastShift: ShiftPortion | null = null;
  if (latest) {
    const counted = latest.actualCashCount !== null ? Number(latest.actualCashCount) : Number(latest.expectedBalance);
    lastShift = {
      handoverId: latest.id,
      staffName: latest.user.name,
      endTime: latest.endTime,
      available: fromCents(toCents(counted) - toCents(float) - takenCents(latest.id, WithdrawalSource.CASH)),
    };
  }
  // balance already starts from the float (see getCurrentDrawerBalance).
  const openShiftCents = toCents(balance) - toCents(float);
  const cashTotalCents = Math.max(0, toCents(lastShift?.available ?? 0) + openShiftCents);

  const gcashShifts = gcashHandovers
    .map((h) => ({
      handoverId: h.id,
      staffName: h.user.name,
      endTime: h.endTime,
      available: fromCents(Math.max(0, toCents(Number(h.digitalSales)) - takenCents(h.id, WithdrawalSource.GCASH))),
    }))
    .filter((s) => s.available > 0);

  return {
    startingCash: float,
    cash: { total: fromCents(cashTotalCents), lastShift, openShift: fromCents(openShiftCents) },
    gcash: {
      total: fromCents(gcashShifts.reduce((sum, s) => sum + toCents(s.available), 0)),
      shifts: gcashShifts,
    },
  };
}

// One withdrawal record to create: a slice of a closed shift's earnings
// (handoverId set) or of the open shift's drawer (handoverId null).
export interface WithdrawalSlice {
  handoverId: string | null;
  amount: number;
}

// Splits one requested amount into per-shift records so every peso stays
// traceable to the shift it came from. The caller must already have checked
// amount <= the source's total.
//  - Cash: the last count's leftover first (its earnings are what's been
//    sitting in the drawer longest), then the open shift's drawer.
//  - GCash: oldest shift first.
export function splitWithdrawal(
  available: AvailableToWithdraw,
  source: WithdrawalSource,
  amount: number
): WithdrawalSlice[] {
  let remaining = toCents(amount);
  const slices: WithdrawalSlice[] = [];

  if (source === WithdrawalSource.GCASH) {
    for (const s of available.gcash.shifts) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, toCents(s.available));
      slices.push({ handoverId: s.handoverId, amount: fromCents(take) });
      remaining -= take;
    }
    return slices;
  }

  const last = available.cash.lastShift;
  const fromLast = last ? Math.min(remaining, Math.max(0, toCents(last.available))) : 0;
  if (last && fromLast > 0) {
    slices.push({ handoverId: last.handoverId, amount: fromCents(fromLast) });
    remaining -= fromLast;
  }
  if (remaining > 0) slices.push({ handoverId: null, amount: fromCents(remaining) });
  return slices;
}
