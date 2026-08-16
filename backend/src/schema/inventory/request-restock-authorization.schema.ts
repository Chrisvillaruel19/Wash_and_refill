import { z } from "zod";

// No body fields: the caller's own verified Admin JWT (requireRole(ADMIN)
// on this route) is the only proof required — nothing to submit.
export const requestRestockAuthorizationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z.object({}),
});
