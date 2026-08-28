import { z } from "zod";
import { ExpenseCategory } from "../../../generated/prisma/client.js";
import { longTextRule, receiptUrlRule } from "../common/validation-rules.js";

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero"),

    category: z.enum(ExpenseCategory, { message: "Invalid expense category" }),

    description: longTextRule("Description"),

    receiptUrl: receiptUrlRule.optional(),
  }),
});
