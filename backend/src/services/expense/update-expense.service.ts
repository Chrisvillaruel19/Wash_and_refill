import { prisma } from "../../lib/prisma.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { ExpenseCategory, AuditAction, Role } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const expenseRepository = new ExpenseRepository();

// Judgment call (not explicitly specified in the task): mirrors the same
// ownership shape just added to Order's mutation endpoints — Staff may only
// correct an expense they personally submitted, Admin may correct any. The
// separate claim-based boundary below (shiftHandoverId) is what the task
// actually asked for; this ownership check is an additional, consistent
// guard so one Staff member can't edit another's submitted expense.
export async function updateExpenseService(
  actorUserId: string,
  actorRole: Role | undefined,
  id: string,
  data: Partial<{
    amount: number;
    category: ExpenseCategory;
    description: string;
    receiptUrl: string;
  }>
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await expenseRepository.findById(id, tx);
      if (!existing) return { notFound: true } as const;

      if (actorRole !== Role.ADMIN && existing.userId !== actorUserId) {
        return { forbidden: true } as const;
      }

      // Once claimed into a Shift Handover, that handover's totals are
      // computed once and frozen (see ShiftHandover model) — never
      // recomputed later. Editing the expense here would silently desync it
      // from the already-closed handover, exactly the reasoning
      // reverse-order-payment.service.ts already applies to Order.
      if (existing.shiftHandoverId !== null) {
        return { alreadyClaimed: true } as const;
      }

      const updated = await expenseRepository.update(id, data, tx);

      await writeAuditLog(tx, {
        userId: actorUserId,
        action: AuditAction.UPDATE,
        module: "Expense",
        description: `Corrected expense of ₱${Number(updated.amount).toFixed(2)} for ${updated.category}`,
        oldValue: {
          amount: existing.amount,
          category: existing.category,
          description: existing.description,
        },
        newValue: {
          amount: updated.amount,
          category: updated.category,
          description: updated.description,
        },
      });

      return { expense: updated } as const;
    });

    if ("notFound" in result) {
      return { code: 404, status: "error", message: "Expense not found" };
    }
    if ("forbidden" in result) {
      return { code: 403, status: "error", message: "You can only edit expenses you submitted." };
    }
    if ("alreadyClaimed" in result) {
      return {
        code: 409,
        status: "error",
        message:
          "This expense has already been reconciled in a Shift Handover and can no longer be edited.",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Expense updated successfully",
      data: { expense: result.expense },
    };
  } catch (error) {
    console.error("updateExpenseService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to update expense",
    };
  }
}
