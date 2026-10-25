import { z } from "zod";

export const listShiftHandoversSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    // Only this staff member's handovers.
    userId: z.string().uuid().optional(),
  }),
});
