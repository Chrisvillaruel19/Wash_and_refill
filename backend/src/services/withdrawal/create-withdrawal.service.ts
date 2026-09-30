import { prisma } from "../../lib/prisma.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { AuditAction, WithdrawalSource } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { InsufficientFundsError } from "./withdrawal-errors.js";
import { getAvailableToWithdraw, splitWithdrawal } from "./earnings.util.js";

const withdrawalRepository = new WithdrawalRepository();

// The Admin asks for one amount of Cash or GCash; the server splits it into
// one record per shift it came from (see splitWithdrawal), so the history
// and each shift's remaining earnings stay exact.
export async function createWithdrawalService(
  userId: string,
  data: { amount: number; reason: string; source?: WithdrawalSource }
) {
  const source = data.source ?? WithdrawalSource.CASH;
  const sourceLabel = source === WithdrawalSource.GCASH ? "GCash" : "cash";
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Must be the first statement — see drawer-lock.ts. Serializes this
      // against handovers and other withdrawals, so the available amount
      // read below can't change before the records are written.
      await acquireDrawerLock(tx);

      const available = await getAvailableToWithdraw(tx);
      const total = source === WithdrawalSource.GCASH ? available.gcash.total : available.cash.total;

      // Compared in centavos: a withdrawal of exactly the available amount
      // must not be rejected over a floating-point fraction.
      if (Math.round(data.amount * 100) > Math.round(total * 100)) {
        throw new InsufficientFundsError(
          source === WithdrawalSource.GCASH
            ? `Only ₱${total.toFixed(2)} GCash is available to withdraw. Cannot withdraw ₱${data.amount.toFixed(2)}.`
            : `Only ₱${total.toFixed(2)} cash is available to withdraw (the ₱${available.startingCash.toFixed(2)} starting cash stays in the drawer). Cannot withdraw ₱${data.amount.toFixed(2)}.`
        );
      }

      const remainingAfter = Math.round((total - data.amount) * 100) / 100;
      const withdrawalDate = new Date();
      const slices = splitWithdrawal(available, source, data.amount);

      // A slice from a closed shift is created already claimed by that
      // shift, so it never counts against the next open shift's drawer. An
      // open-drawer slice stays unclaimed and is swept into the next Shift
      // Handover like any other drawer activity.
      const records = [];
      for (const slice of slices) {
        records.push(
          await withdrawalRepository.create(
            {
              userId,
              amount: slice.amount,
              reason: data.reason,
              remainingCash: remainingAfter,
              withdrawalDate,
              source,
              ...(slice.handoverId
                ? { earningsFromHandoverId: slice.handoverId, shiftHandoverId: slice.handoverId }
                : {}),
            },
            tx
          )
        );
      }

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.WITHDRAWAL,
        module: "Withdrawal",
        description: `Withdrew ₱${data.amount.toFixed(2)} ${sourceLabel} — ${data.reason}`,
        newValue: {
          amount: data.amount,
          reason: data.reason,
          source,
          slices: slices.map((s) => ({ fromHandoverId: s.handoverId, amount: s.amount })),
          remainingAvailable: remainingAfter,
        },
      });

      return records;
    });

    return {
      code: 201,
      status: "success",
      message: "Withdrawal recorded successfully",
      data: { withdrawals: created },
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
