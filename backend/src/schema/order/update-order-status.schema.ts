import { z } from "zod";
import { OrderStatus } from "../../../generated/prisma/client.js";

// Only validates that this is a real OrderStatus value — whether THIS
// specific transition is allowed from the order's CURRENT status is a
// business rule that depends on DB state, enforced in the service layer
// (order-status-flow.util.ts), not here.
export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid order id"),
  }),
  body: z.object({
    status: z.enum(OrderStatus, { message: "Invalid status" }),
  }),
});
