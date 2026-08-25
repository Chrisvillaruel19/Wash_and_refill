import { z } from "zod";
import { PaymentMethod } from "../../../generated/prisma/client.js";
import { phoneNumberRule } from "../customer/phone-param.schema.js";
import { nameRule } from "../common/validation-rules.js";
import { orderItemSchema } from "./order-item.schema.js";

export const createOrderSchema = z.object({
  body: z.object({
    customerName: nameRule,

    phoneNumber: phoneNumberRule,

    paymentMethod: z.enum(PaymentMethod, { message: "Invalid payment method" }).optional(),

    amountPaid: z
      .number({ message: "Amount paid is required" })
      .nonnegative("Amount paid cannot be negative"),

    items: z.array(orderItemSchema).min(1, "At least one item is required"),

    // Client-generated per-submission-attempt token (crypto.randomUUID() on
    // the frontend) — see Order.idempotencyKey in schema.prisma for why this
    // exists and how a retried request is handled.
    idempotencyKey: z
      .string({ message: "Idempotency key is required" })
      .min(1, "Idempotency key cannot be empty")
      .max(100, "Idempotency key is too long"),
  }),
});
