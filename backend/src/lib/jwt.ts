import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Role } from "../../generated/prisma/client.js";

export type JwtPayload = { sub: string; type: "access" | "refresh"; role?: Role; jti?: string };

// Distinct from JwtPayload (sub/role are meaningless here — there is no
// single "subject" user, since a restock authorization deliberately spans
// two different users: the Admin who approved it and the Staff member who
// will spend it). staffUserId/inventoryId are what "scoped to the specific
// restock operation/item" is enforced against; authorizedByAdminId exists
// only to attribute the approval in the audit log.
export type RestockAuthorizationPayload = {
  type: "restock-authorization";
  staffUserId: string;
  inventoryId: string;
  authorizedByAdminId: string;
  jti: string;
};

// No fallback: signing tokens with a hardcoded, source-visible secret would
// make every token forgeable. Fail fast at startup instead. Written as a
// single expression (rather than an `if` guard above the functions below)
// so `jwtSecret` is typed as `string`, not `string | undefined` — TS does
// not narrow an outer const's type inside hoisted function declarations
// that close over it, even after an early-return/throw guard.
const jwtSecret: string =
  process.env.JWT_SECRET ??
  (() => {
    throw new Error(
      "JWT_SECRET environment variable is required but not set. Refusing to start with an insecure default."
    );
  })();

export enum TokenExpiry {
  ACCESS_TOKEN_EXPIRES = "15m",
  REFRESH_TOKEN_EXPIRES = "7d",
  // Deliberately short — this is a standing approval to perform one
  // sensitive write, not a session. Long enough for the Staff member to
  // finish typing a quantity into the next modal, short enough that a
  // leaked/unused authorization is worthless within minutes.
  RESTOCK_AUTHORIZATION_EXPIRES = "3m",
}

export function signAccessToken(userId: string, role: Role, duration: SignOptions["expiresIn"]) {
  const payload: JwtPayload = { sub: userId, type: "access", role };
  return jwt.sign(payload, jwtSecret, { expiresIn: duration });
}

export function signRefreshToken(userId: string, duration: SignOptions["expiresIn"]) {
  // jti guarantees uniqueness even when two refresh tokens are issued for
  // the same user within the same second — without it, `iat`/`exp`/`sub`
  // alone can produce a byte-identical JWT (jsonwebtoken's `iat` is
  // second-precision), which collides with the Token table's unique
  // constraint on rotation. Random per token, not used for anything else.
  const payload: JwtPayload = { sub: userId, type: "refresh", jti: crypto.randomBytes(16).toString("hex") };
  return jwt.sign(payload, jwtSecret, { expiresIn: duration });
}


export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    return payload.type === "access" ? payload : null;
  } catch {
    return null;
  }
}


export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    return payload.type === "refresh" ? payload : null;
  } catch {
    return null;
  }
}

export function signRestockAuthorization(
  params: { staffUserId: string; inventoryId: string; authorizedByAdminId: string },
  duration: SignOptions["expiresIn"]
) {
  // jti for the same collision-avoidance reason as signRefreshToken above —
  // without it, two authorizations issued for the same staff+item within
  // the same second could be byte-identical, colliding with the Token
  // table's unique constraint.
  const payload: RestockAuthorizationPayload = {
    type: "restock-authorization",
    jti: crypto.randomBytes(16).toString("hex"),
    ...params,
  };
  return jwt.sign(payload, jwtSecret, { expiresIn: duration });
}

export function verifyRestockAuthorization(token: string): RestockAuthorizationPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret) as RestockAuthorizationPayload;
    return payload.type === "restock-authorization" ? payload : null;
  } catch {
    return null;
  }
}


export function toMilliseconds(duration?: string | number) {
  if (duration === undefined) return undefined;
  if (typeof duration === "number") {
    return duration * 1000;
  }

  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return undefined;

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
}