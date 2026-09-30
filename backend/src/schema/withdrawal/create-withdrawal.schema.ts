import { z } from "zod";
import { WithdrawalSource } from "../../../generated/prisma/client.js";
import { longTextRule } from "../common/validation-rules.js";

// remainingCash/withdrawalDate/userId are server-computed — never accepted
// from the client.
export const createWithdrawalSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero"),

    reason: longTextRule("Reason"),

    // Omitted = cash. Which shifts the amount comes from is decided by the
    // server, never the client — see splitWithdrawal.
    source: z.enum(WithdrawalSource, { message: "Invalid withdrawal source" }).optional(),
  }),
});
