import { z } from "zod";
import { pinRule } from "../common/validation-rules.js";

export const setRestockPinSchema = z.object({
  body: z.object({
    pin: pinRule,
    confirmPin: pinRule,
  }),
}).refine(
  (data) => data.body.pin === data.body.confirmPin,
  {
    message: "PINs do not match",
    path: ["body", "confirmPin"],
  }
);
