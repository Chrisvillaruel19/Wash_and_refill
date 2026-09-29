import { prisma } from "../../lib/prisma.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { getCurrentDrawerBalance, getDrawerStart } from "../shift-handover/reconciliation.util.js";
import { AuditAction, WithdrawalSource } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { InsufficientFundsError } from "./withdrawal-errors.js";
import { getShiftEarningsAvailable } from "./earnings.util.js";

const withdrawalRepository = new WithdrawalRepository();

// Two kinds of withdrawal:
//  - From the OPEN shift's drawer (no fromHandoverId): cash only, and never
//    the starting float — that stays in the drawer for change.
//  - From a CLOSED shift's earnings (fromHandoverId set): that shift's
//    counted cash minus its float, or its GCash sales — see earnings.util.ts.
export async function createWithdrawalService(
  userId: string,
  data: { amount: number; reason: string; source?: WithdrawalSource; fromHandoverId?: string }
) {
  const source = data.source ?? WithdrawalSource.CASH;
  const sourceLabel = source === WithdrawalSource.GCASH ? "GCash" : "cash";
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Must be the first statement — see drawer-lock.ts. This is what
      // makes getCurrentDrawerBalance's read safe against a concurrent
      // handover or another concurrent withdrawal: both operation types
      // serialize through this same lock, so neither can read a
      // pre-mutation balance while the other is mid-write.
      await acquireDrawerLock(tx);

      let available: number;
      let fromLabel: string;
      if (data.fromHandoverId) {
        const shift = await getShiftEarningsAvailable(data.fromHandoverId, tx);
        if (!shift) throw new InsufficientFundsError("That shift handover no longer exists.");
        available = source === WithdrawalSource.GCASH ? shift.gcashAvailable : shift.cashAvailable;
        fromLabel = `${shift.staffName}'s shift (${shift.endTime.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })})`;
      } else {
        if (source !== WithdrawalSource.CASH) {
          throw new InsufficientFundsError("GCash can only be withdrawn from a closed shift's earnings.");
        }
        const [balance, float] = await Promise.all([getCurrentDrawerBalance(tx), getDrawerStart(tx)]);
        available = balance - float;
        fromLabel = "the open shift's drawer";
      }

      const remainingCash = available - data.amount;

      // Rounded to the nearest centavo before the guard: these totals are a
      // chain of floating-point money sums (see the identical issue in
      // Shift Handover's cashStatus check), so a withdrawal of exactly the
      // available amount could otherwise land a fraction of a centavo below
      // zero and be falsely rejected as insufficient funds.
      if (Math.round(remainingCash * 100) / 100 < 0) {
        throw new InsufficientFundsError(
          `Only ₱${Math.max(0, available).toFixed(2)} ${sourceLabel} is available to withdraw from ${fromLabel} (the starting cash stays in the drawer). Cannot withdraw ₱${data.amount.toFixed(2)}.`
        );
      }

      // Open-shift withdrawals stay unclaimed (shiftHandoverId null) and are
      // swept into whichever Shift Handover reconciles them next. A closed
      // shift's earnings withdrawal is created already claimed by that
      // shift, so it never counts against the next open shift's drawer.
      const withdrawal = await withdrawalRepository.create(
        {
          userId,
          amount: data.amount,
          reason: data.reason,
          remainingCash,
          withdrawalDate: new Date(),
          source,
          ...(data.fromHandoverId
            ? { earningsFromHandoverId: data.fromHandoverId, shiftHandoverId: data.fromHandoverId }
            : {}),
        },
        tx
      );

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.WITHDRAWAL,
        module: "Withdrawal",
        description: `Withdrew ₱${data.amount.toFixed(2)} ${sourceLabel} from ${fromLabel} — ${data.reason}`,
        newValue: {
          amount: data.amount,
          reason: data.reason,
          source,
          fromHandoverId: data.fromHandoverId ?? null,
          remainingAvailable: remainingCash,
        },
      });

      return withdrawal;
    });

    return {
      code: 201,
      status: "success",
      message: "Withdrawal recorded successfully",
      data: { withdrawal: created },
    };
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return { code: 409, status: "error", message: error.message };
    }

    console.error("createWithdrawalService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to record withdrawal",
    };
  }
}
