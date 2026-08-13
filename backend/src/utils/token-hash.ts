import crypto from "crypto";

// Refresh/reset tokens are already high-entropy random values (32 random
// bytes), not user-chosen secrets — a fast deterministic hash is correct
// here, unlike password.ts's slow salted PBKDF2. The goal is only to avoid
// storing a directly-usable session credential in the database at rest; it
// is not defending against brute force of a low-entropy value.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
