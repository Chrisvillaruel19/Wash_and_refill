import { z } from "zod";

export const refundIdParamSchema = z.object({
  params: z.object({
    refundId: z.string().uuid("Invalid refund id"),
  }),
});
