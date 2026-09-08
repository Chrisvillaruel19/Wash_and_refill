import { z } from "zod";

export const listEmployeesSchema = z.object({
  query: z.object({
    status: z.enum(["active", "archived"]).optional(),
  }),
});
