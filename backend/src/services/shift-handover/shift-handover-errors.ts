// Same pattern as Orders' OrderValidationError/InsufficientStockError:
// distinguishes expected business-rule rejections from genuine failures so
// the outer catch block maps them to the right HTTP status instead of 500.
export class NoActiveAttendanceError extends Error {}
