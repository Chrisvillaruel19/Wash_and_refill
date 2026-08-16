import { z } from "zod";

export const requestRestockAuthorizationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid inventory id"),
  }),
  body: z.object({
    adminUsername: z.string().min(1, "Admin username is required"),
    adminPassword: z.string().min(1, "Admin password is required"),
  }),
});
