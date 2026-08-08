import { z } from "zod";

// Everything else (startTime, endTime, sales breakdown, expense,
// withdrawal, expectedBalance, cashStatus) is server-computed — never
// accepted from the client.
export const createShiftHandoverSchema = z.object({
  body: z.object({
    actualCashCounted: z
      .number({ message: "Actual cash counted is required" })
      .nonnegative("Actual cash counted cannot be negative"),

    notes: z.string().trim().max(500, "Notes must be at most 500 characters").optional(),
  }),
});
