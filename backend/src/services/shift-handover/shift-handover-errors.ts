// Same pattern as Orders' OrderValidationError/InsufficientStockError:
// distinguishes expected business-rule rejections from genuine failures so
// the outer catch block maps them to the right HTTP status instead of 500.
export class NoActiveAttendanceError extends Error {}

// One handover per open shift: thrown when a handover already exists for
// the active Attendance session (existsForUserSince, checked against its
// timeIn) — the second submission is a genuine duplicate, not a new shift.
export class DuplicateShiftHandoverError extends Error {}
