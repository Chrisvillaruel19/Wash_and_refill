// Distinguishes an expected, business-rule rejection thrown inside the
// withdrawal creation transaction from a genuinely unexpected failure, so
// the outer catch block can map it to 409 instead of a generic 500. Prisma's
// $transaction rethrows whatever the callback throws after rolling back, so
// this surfaces cleanly to the caller. Mirrors order/order-errors.ts.
export class InsufficientFundsError extends Error {}
