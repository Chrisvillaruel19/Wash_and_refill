import { z } from "zod";
import { pinRule } from "../common/validation-rules.js";

export const verifyRestockPinSchema = z.object({
  body: z.object({
    pin: pinRule,
  }),
});
