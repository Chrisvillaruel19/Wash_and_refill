import { Prisma } from "../../generated/prisma/client.js";

// Prisma 7 with the @prisma/adapter-pg driver adapter surfaces database
// constraint violations as a DriverAdapterError wrapping the raw Postgres
// error (with the real Postgres SQLSTATE in `error.cause.code`), not the
// classic Prisma.PrismaClientKnownRequestError with a "P2003" code the
// engine-based client used to throw. Checking both shapes here so every
// module that touches a RESTRICT relation (Orders -> Customer/Inventory,
// Packages -> PackageDetail, etc.) gets this right without rediscovering
// it independently. 23001 = restrict_violation, 23503 =
// foreign_key_violation (Postgres SQLSTATE codes).
export function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2003";
  }

  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === "23001" || cause?.code === "23503";
}
