import { prisma } from "../../lib/prisma.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { ExpenseCategory, AuditAction } from "../../../generated/prisma/client.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const expenseRepository = new ExpenseRepository();

export async function createExpenseService(
  userId: string,
  data: { amount: number; category: ExpenseCategory; description: string; receiptUrl?: string }
) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const expense = await expenseRepository.create(
        {
          userId,
          amount: data.amount,
          category: data.category,
          description: data.description,
          receiptUrl: data.receiptUrl,
          expenseDate: new Date(),
        },
        tx
      );

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.CREATE,
        module: "Expense",
        description: `Recorded expense of ₱${data.amount.toFixed(2)} for ${data.category}`,
        newValue: { amount: data.amount, category: data.category, description: data.description },
      });

      return expense;
    });

    return {
      code: 201,
      status: "success",
      message: "Expense recorded successfully",
      data: { expense: created },
    };
  } catch (error) {
    console.error("createExpenseService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to record expense",
    };
  }
}
