import { prisma } from "../../lib/prisma.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { acquireDrawerLock } from "../../lib/drawer-lock.js";
import { getCurrentDrawerBalance } from "../shift-handover/reconciliation.util.js";
import { AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const withdrawalRepository = new WithdrawalRepository();

export async function createWithdrawalService(
  userId: string,
  data: { amount: number; reason: string }
) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Must be the first statement — see drawer-lock.ts. This is what
      // makes getCurrentDrawerBalance's read safe against a concurrent
      // handover or another concurrent withdrawal: both operation types
      // serialize through this same lock, so neither can read a
      // pre-mutation balance while the other is mid-write.
      await acquireDrawerLock(tx);

      const currentBalance = await getCurrentDrawerBalance(tx);
      const remainingCash = currentBalance - data.amount;

      // Left unclaimed (shiftHandoverId stays null) — this withdrawal
      // will be swept into whichever Shift Handover reconciles it next.

      const withdrawal = await withdrawalRepository.create(
        {
          userId,
          amount: data.amount,
          reason: data.reason,
          remainingCash,
          withdrawalDate: new Date(),
        },
        tx
      );

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.WITHDRAWAL,
        module: "Withdrawal",
        description: `Withdrew ₱${data.amount.toFixed(2)} — ${data.reason}`,
        newValue: { amount: data.amount, reason: data.reason, remainingCash },
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
    console.error("createWithdrawalService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to record withdrawal",
    };
  }
}
