import { z } from "zod";
import { ExpenseCategory } from "../../../generated/prisma/client.js";

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero"),

    category: z.enum(ExpenseCategory, { message: "Invalid expense category" }),

    description: z
      .string({ message: "Description is required" })
      .min(1, "Description is required"),

    // Base64 data URL from the frontend's file input — stored as-is, no
    // external file storage (approved capstone-scale tradeoff).
    receiptUrl: z.string().optional(),
  }),
});
