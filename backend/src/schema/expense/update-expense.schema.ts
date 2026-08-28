import { z } from "zod";
import { ExpenseCategory } from "../../../generated/prisma/client.js";
import { longTextRule, receiptUrlRule } from "../common/validation-rules.js";

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid expense id"),
  }),
  body: z
    .object({
      amount: z.number().positive("Amount must be greater than zero").optional(),
      category: z.enum(ExpenseCategory, { message: "Invalid expense category" }).optional(),
      description: longTextRule("Description").optional(),
      receiptUrl: receiptUrlRule.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
