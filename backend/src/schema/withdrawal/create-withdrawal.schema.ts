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

    // Omitted = cash from the open shift's drawer.
    source: z.enum(WithdrawalSource, { message: "Invalid withdrawal source" }).optional(),

    // Set = withdrawing a closed shift's earnings (that Shift Handover's id).
    fromHandoverId: z.string().uuid("Invalid shift handover id").optional(),
  }),
});
