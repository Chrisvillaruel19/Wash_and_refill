// Distinguishes expected, business-rule rejections thrown inside the order
// creation transaction from genuinely unexpected failures, so the outer
// catch block can map them to the right HTTP status (400/409) instead of a
// generic 500. Prisma's $transaction rethrows whatever the callback throws
// after rolling back, so these surface cleanly to the caller.
export class OrderValidationError extends Error {}
export class InsufficientStockError extends Error {}
