import { z } from "zod";

// Shared across every schema that collects a phone number (Customer, New
// Order, Employee) — exactly 11 digits, numeric only. Matches PH mobile
// number format (e.g. 09171234567). No spaces, dashes, parentheses, or "+"
// — those were previously accepted and are the reason a customer could end
// up with three differently-formatted records of the "same" number.
export const phoneNumberRule = z
  .string({ message: "Phone number is required" })
  .regex(/^\d+$/, "Phone number must contain digits only (no spaces, dashes, or symbols)")
  .length(11, "Phone number must be exactly 11 digits");

// "" from a blank <input> must behave like the field being omitted, not
// fail the required/length checks above with a confusing error.
export function optionalPhoneNumberRule() {
  return z.preprocess((val) => (val === "" ? undefined : val), phoneNumberRule.optional());
}

// Shared across every schema that collects a person's name (Customer,
// Employee). Unicode letters (so accented names like "Muñoz" work), spaces,
// and the punctuation actually used within names — apostrophe (O'Brien),
// hyphen (Cruz-Santos), period (Jr.). No digits, no other symbols. Requires
// at least one letter so "..." or "--" can't slip through as a "name".
// .trim() is a transform (runs before every check below, and permanently
// strips leading/trailing whitespace from the stored value) — a name can
// never start or end with a space by the time it reaches the regex checks,
// let alone get saved. Internal double-spaces ("John  Doe") aren't touched
// by trim() though, so that's checked separately below.
export const nameRule = z
  .string({ message: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters")
  .regex(/^[\p{L}\s.'-]+$/u, "Name can only contain letters, spaces, apostrophes, hyphens, and periods")
  .regex(/\p{L}/u, "Name must contain at least one letter")
  .regex(/^\S+(?: \S+)*$/, "Name cannot contain multiple consecutive spaces");

// Username: alphanumeric + underscore only, no spaces — the actual login
// credential, so it can't contain characters that would be ambiguous or
// awkward to type back in at the login screen.
export const usernameRule = z
  .string({ message: "Username is required" })
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

// Password: one consistent minimum enforced everywhere a password is ever
// set (employee creation, employee reset, forgot/reset-password) — login
// itself intentionally does NOT use this (see login.schema.ts: a login
// attempt must never reveal server-side password *policy*, only whether
// the credentials are correct).
export const passwordRule = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters");

// Restock Authorization PIN: 4-6 digits, numeric only. Deliberately short
// like a bank card PIN (not a password) — it's meant to be quickly typed by
// Staff at the point of restocking, memorized by whichever Admin set it,
// and rate-limited server-side against brute-force rather than relying on
// length for security.
export const pinRule = z
  .string({ message: "PIN is required" })
  .regex(/^\d+$/, "PIN must contain digits only")
  .min(4, "PIN must be at least 4 digits")
  .max(6, "PIN must be at most 6 digits");

// Generic short text field (item/service/package names) — same "required,
// trimmed, reasonable max length" shape used in several catalog schemas.
export function shortTextRule(label: string, max = 100) {
  return z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

// Generic longer free-text field (expense description, withdrawal reason,
// shift-handover notes) — required but allows more room than a name/title.
export function longTextRule(label: string, max = 500) {
  return z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

// Shared by Expense create/update — a base64 image data URL from the
// frontend's file input, stored as-is (no external file storage, approved
// capstone-scale tradeoff). Bounded and shape-checked: previously accepted
// any string of any length, which meant nothing stopped a malformed value
// or an unbounded upload from being persisted. ~3MB of base64 text is
// comfortably under the global 5MB JSON body limit (app.ts) with room left
// for the rest of the request, while still fitting a genuine phone-camera
// receipt photo (base64 runs ~33% larger than the underlying file, so this
// covers roughly a 2.2MB image).
const MAX_RECEIPT_DATA_URL_LENGTH = 3 * 1024 * 1024;

export const receiptUrlRule = z
  .string()
  .max(MAX_RECEIPT_DATA_URL_LENGTH, "Receipt image is too large.")
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/, "Receipt must be a valid image.");
