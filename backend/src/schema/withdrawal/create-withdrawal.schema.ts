import { z } from "zod";

// remainingCash/withdrawalDate/userId are server-computed — never accepted
// from the client.
export const createWithdrawalSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero"),

    reason: z
      .string({ message: "Reason is required" })
      .min(1, "Reason is required"),
  }),
});
