import { z } from "zod";

// Admin-only starting-cash configuration (Phase 8/9). Positive and finite
// only — zero or negative would make "no previous handover" reconciliation
// nonsensical, and the upper bound is a sanity ceiling against a data-entry
// mistake (an extra zero), not a real business limit.
export const updateDrawerSettingsSchema = z.object({
  body: z.object({
    defaultStartingCash: z
      .number({ message: "Default starting cash is required" })
      .finite("Default starting cash must be a valid number")
      .positive("Default starting cash must be greater than zero")
      .max(1_000_000, "Default starting cash is unreasonably large"),
  }),
});
