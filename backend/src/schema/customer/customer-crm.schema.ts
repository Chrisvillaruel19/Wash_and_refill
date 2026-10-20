import { z } from "zod";

export const listCustomerSummariesSchema = z.object({
  query: z.object({
    search: z.string().max(100, "Search is too long").optional(),
    sort: z.enum(["recent", "visits", "spent", "name"]).optional(),
    filter: z.enum(["all", "regular"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
});
