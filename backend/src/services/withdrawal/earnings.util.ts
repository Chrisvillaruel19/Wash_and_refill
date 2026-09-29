import { prisma } from "../../lib/prisma.js";
import { Prisma, WithdrawalSource } from "../../../generated/prisma/client.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { getCurrentDrawerBalance, getDrawerStart } from "../shift-handover/reconciliation.util.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const shiftHandoverRepository = new ShiftHandoverRepository();
const withdrawalRepository = new WithdrawalRepository();

// How many recent closed shifts to offer earnings from.
const RECENT_SHIFTS = 30;

type HandoverTotals = NonNullable<Awaited<ReturnType<ShiftHandoverRepository["findForEarnings"]>>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

// A closed shift's earnings, before anything was withdrawn from them:
//   cash  = cash counted at handover − the starting float that shift began with
//   gcash = that shift's GCash sales
// The float the shift started with isn't stored directly, but follows from
// the handover's own saved totals:
//   expectedBalance = float + cashSales − expense − withdrawal
// so float = expectedBalance − cashSales + expense + withdrawal, where
// cashSales = all sales − GCash sales. The float itself is never
// withdrawable — it stays in the drawer for the next shift.
function shiftEarnings(h: HandoverTotals) {
  const allSales = Number(h.laundryEarnings) + Number(h.supplySales) + Number(h.customServiceSales);
  const gcashSales = Number(h.digitalSales);
  const cashSales = allSales - gcashSales;
  const float = Number(h.expectedBalance) - cashSales + Number(h.expense) + Number(h.withdrawal);
  const counted = h.actualCashCount !== null ? Number(h.actualCashCount) : Number(h.expectedBalance);
  return { cash: Math.max(0, counted - float), gcash: Math.max(0, gcashSales) };
}

export interface ShiftEarningsAvailable {
  handoverId: string;
  staffName: string;
  endTime: Date;
  cashAvailable: number;
  gcashAvailable: number;
}

async function withRemaining(handovers: HandoverTotals[], tx: PrismaClientOrTx): Promise<ShiftEarningsAvailable[]> {
  const withdrawn = await withdrawalRepository.sumEarningsWithdrawn(
    handovers.map((h) => h.id),
    tx
  );
  const taken = (id: string, source: WithdrawalSource) =>
    Number(withdrawn.find((w) => w.earningsFromHandoverId === id && w.source === source)?._sum.amount ?? 0);

  return handovers.map((h) => {
    const earned = shiftEarnings(h);
    return {
      handoverId: h.id,
      staffName: h.user.name,
      endTime: h.endTime,
      cashAvailable: Math.max(0, round2(earned.cash - taken(h.id, WithdrawalSource.CASH))),
      gcashAvailable: Math.max(0, round2(earned.gcash - taken(h.id, WithdrawalSource.GCASH))),
    };
  });
}

// Remaining earnings for one closed shift (null if it doesn't exist).
export async function getShiftEarningsAvailable(handoverId: string, tx: PrismaClientOrTx = prisma) {
  const h = await shiftHandoverRepository.findForEarnings(handoverId, tx);
  if (!h) return null;
  const [result] = await withRemaining([h], tx);
  return result;
}

// Everything the Admin can withdraw right now: cash from the open shift's
// drawer (never the starting float), plus whatever is left of each recent
// closed shift's cash and GCash earnings.
export async function getAvailableToWithdraw(tx: PrismaClientOrTx = prisma) {
  const [balance, float, handovers] = await Promise.all([
    getCurrentDrawerBalance(tx),
    getDrawerStart(tx),
    shiftHandoverRepository.findRecentForEarnings(RECENT_SHIFTS, tx),
  ]);
  const shifts = await withRemaining(handovers, tx);

  return {
    openShiftCash: Math.max(0, round2(balance - float)),
    startingCash: float,
    shifts: shifts.filter((s) => s.cashAvailable > 0 || s.gcashAvailable > 0),
  };
}
