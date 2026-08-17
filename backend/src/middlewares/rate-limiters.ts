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
