import { z } from "zod";
import { PaymentMethod } from "../../../generated/prisma/client.js";

// One refund for one order. The amount's upper limit (what's still
// refundable) depends on the database, so refund-order.service.ts checks it.
export const refundOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid order id"),
  }),
  body: z.object({
    amount: z
      .number({ message: "Refund amount is required" })
      .positive("Refund amount must be greater than zero")
      // Tolerance, not ===: 0.29 * 100 is 28.999999999999996 in floating point.
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
        message: "Refund amount can have at most 2 decimal places",
      }),
    method: z.enum(PaymentMethod, { message: "Refund method is required" }),
    reason: z
      .string({ message: "A reason is required" })
      .trim()
      .min(1, "A reason is required")
      .max(500, "Reason must be at most 500 characters"),
  }),
});
