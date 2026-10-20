import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
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
const poolOptions = {
  connectionString: ENV.DATABASE_URL,
  statement_timeout: 15000,
  idle_in_transaction_session_timeout: 10000,
};

// DB_DRIVER=neon: the same Postgres protocol, tunnelled over secure
// WebSockets on port 443 — for networks where port 5432 is blocked or
// stalls. Transactions and row locks behave exactly as with "pg".
function createAdapter() {
  if (ENV.DB_DRIVER === "neon") {
    neonConfig.webSocketConstructor = ws;
    return new PrismaNeon(poolOptions);
  }
  return new PrismaPg(poolOptions);
}

// Prisma's interactive-transaction defaults (maxWait: 2000ms, timeout: 5000ms)
// assume an always-warm connection pool. Neon's serverless compute
// autosuspends when idle, so the first request after any lull (start of
// shift, after a lunch break, overnight) can take longer than 2s just to
// wake the compute and hand back a connection — every $transaction call in
// this app (order creation, withdrawals, shift handover, etc.) would fail
// with P2028 before the query even runs. Reproduced live during testing.
// maxWait raised to comfortably absorb a cold wake; timeout raised to match
// the adapter's own statement_timeout above.
const prisma = new PrismaClient({
  adapter: createAdapter(),
  transactionOptions: { maxWait: 10000, timeout: 15000 },
});

export { prisma };
