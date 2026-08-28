import rateLimit from "express-rate-limit";

// Restock Authorization PINs are 4-6 digits — a much smaller keyspace than
// the rest of this app, deliberately, so a Staff member can type one
// quickly. This limiter is the mitigation for that tradeoff: it caps how
// many PIN guesses either the pre-check (verify-restock-pin) or the actual
// restock route can receive from one client in the window, on top of
// userRepository.verifyRestockPin's own PIN verification. Shared between
// both routes (auth.routes.ts and inventory.routes.ts) so the guess budget
// is the same regardless of which endpoint a client hits.
export const restockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, status: "error", message: "Too many requests, please try again later." },
});

// Money-affecting create endpoints (Orders, Expenses, Withdrawals) had no
// throttle at all beyond requiring a valid auth token — a compromised or
// careless Staff session (or a stray script hitting these in a loop) could
// otherwise hammer them without limit. 60 per 5 minutes is generous enough
// that no real shop's peak usage would ever come close (that's one every 5
// seconds, sustained) while still capping runaway/abusive traffic.
export const mutationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, status: "error", message: "Too many requests, please try again later." },
});
