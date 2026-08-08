import { z } from "zod";
import { longTextRule } from "../common/validation-rules.js";

// remainingCash/withdrawalDate/userId are server-computed — never accepted
// from the client.
export const createWithdrawalSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero"),

    reason: longTextRule("Reason"),
  }),
});
