import crypto from "crypto";

const ITERATIONS = 120000;
const KEYLEN = 64;
const DIGEST = "sha512";

// Hash Password
export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `${salt}:${ITERATIONS}:${derived}`;
}

// Password Verifier
export function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");

  if (parts.length !== 3) {
    return false;
  }

  const [salt, iterStr, hash] = parts;

  const iters = parseInt(iterStr, 10);

  const derived = crypto.pbkdf2Sync(
    password,
    salt,
    iters,
    KEYLEN,
    DIGEST
  ).toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const derivedBuffer = Buffer.from(derived, "hex");

  if (hashBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    hashBuffer,
    derivedBuffer
  );
}