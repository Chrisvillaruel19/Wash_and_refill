// Shared validation used by every form that collects a phone number or a
// person's name (Customers, New Order, Employees). Mirrors the backend's
// authoritative rules exactly (backend/src/schema/common/validation-rules.ts)
// — this file is a fast, friendly pre-check for the user; the backend
// re-validates independently and is the real source of truth.

export const PHONE_ERROR_MESSAGE = "Phone number must be exactly 11 digits (0-9 only).";

export function isValidPhone(value: string): boolean {
  return /^\d{11}$/.test(value);
}

// For onChange handlers — strips anything that isn't a digit and caps the
// length at 11 as the user types, so an invalid character or an 12th digit
// is simply never accepted rather than being typed and then rejected.
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export const NAME_ERROR_MESSAGE =
  "Name must be 2-100 characters, contain at least one letter, and can only contain letters, single spaces, apostrophes, hyphens, and periods (no numbers, no leading space, no double spaces).";

const NAME_PATTERN = /^[\p{L}\s.'-]+$/u;
const HAS_LETTER_PATTERN = /\p{L}/u;
// Mirrors the backend's nameRule exactly: no leading/trailing space (already
// guaranteed by the .trim() below, but checked explicitly for clarity) and
// no double-spaces anywhere in the middle of the name.
const NO_CONSECUTIVE_SPACES_PATTERN = /^\S+(?: \S+)*$/;

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 100 &&
    NAME_PATTERN.test(trimmed) &&
    HAS_LETTER_PATTERN.test(trimmed) &&
    NO_CONSECUTIVE_SPACES_PATTERN.test(trimmed)
  );
}

// For onChange handlers — strips any character that isn't a letter, space,
// apostrophe, hyphen, or period as the user types (digits and other symbols
// never make it into the field at all), then prevents a leading space and
// collapses any run of spaces down to one as the user types — so "John  Doe"
// or " John" are never even reachable states, not just rejected on submit.
const NAME_INPUT_FILTER = /[^\p{L}\s.'-]/gu;

export function sanitizeNameInput(value: string): string {
  return value.replace(NAME_INPUT_FILTER, "").replace(/^ +/, "").replace(/ {2,}/g, " ");
}

export const USERNAME_ERROR_MESSAGE =
  "Username must be 3-30 characters and can only contain letters, numbers, and underscores.";

export function isValidUsername(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9_]+$/.test(trimmed);
}

export const PASSWORD_ERROR_MESSAGE = "Password must be at least 8 characters.";

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}
