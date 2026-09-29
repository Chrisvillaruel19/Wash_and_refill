import { z } from "zod";
import { PaymentMethod } from "../../../generated/prisma/client.js";

// Required, unlike createOrder's optional paymentMethod: an order created
// Unpaid has no method yet, so this is the only point where the real
// method can be captured. Without it, cash-drawer math (Shift Handover,
// Admin Dashboard) has to guess Cash.
export const markOrderPaidSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid order id"),
  }),
  body: z.object({
    paymentMethod: z.enum(PaymentMethod, { message: "Payment method is required" }),
  }),
});
