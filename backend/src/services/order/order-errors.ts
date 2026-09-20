// Distinguishes expected, business-rule rejections thrown inside the order
// creation transaction from genuinely unexpected failures, so the outer
// catch block can map them to the right HTTP status (400/409) instead of a
// generic 500. Prisma's $transaction rethrows whatever the callback throws
// after rolling back, so these surface cleanly to the caller.
export class OrderValidationError extends Error {}
export class InsufficientStockError extends Error {}

// Authentication (a valid JWT) and active work authorization (a currently
// open Attendance session) are different things — thrown when a Staff user
// has no active shift, so they can't create orders while off the clock.
// Never applies to Admin (see createOrderService).
export class NoActiveShiftError extends Error {}
