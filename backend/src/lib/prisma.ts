import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { ENV } from "../config/env.js";

// ENV.DATABASE_URL is validated at startup (see config/env.ts) — this can
// never silently become the literal string "undefined" the way reading
// process.env.DATABASE_URL directly could.
//
// statement_timeout/idle_in_transaction_session_timeout: a global safety
// net, not specific to Shift Handover. Without this, a crashed or hung
// request holding a row lock (e.g. DrawerState's SELECT ... FOR UPDATE)
// would block every other drawer-mutating operation until the connection
// is detected as dead at the TCP level, which can take minutes. No query
// in this app legitimately needs longer than a few seconds.
const adapter = new PrismaPg({
  connectionString: ENV.DATABASE_URL,
  statement_timeout: 15000,
  idle_in_transaction_session_timeout: 10000,
});
const prisma = new PrismaClient({ adapter });

export { prisma };