import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    username: z
      .string({ message: "Username is required" })
      .min(3, "Username must be at least 3 characters long"),

    password: z
      .string({ message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
  }),
});