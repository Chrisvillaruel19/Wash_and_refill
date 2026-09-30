import { z } from "zod";

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    // "true" = only the caller's own orders (resolved from the JWT, never
    // a client-supplied user id).
    mine: z.enum(["true", "false"]).optional(),
    // "true" = include each order's line items (Claim Monitoring's Excel
    // export); otherwise the list stays lean, see OrderRepository.
    includeItems: z.enum(["true", "false"]).optional(),
  }),
});
