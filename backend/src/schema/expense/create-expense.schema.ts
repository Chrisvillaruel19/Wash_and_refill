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

    // Required — every expense must be backed by a receipt photo.
    receiptUrl: z.string({ message: "A receipt image is required" }).pipe(receiptUrlRule),
  }),
});
