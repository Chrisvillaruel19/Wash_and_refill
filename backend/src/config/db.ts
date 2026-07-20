import { Pool } from "@neondatabase/serverless";
import { env } from "./env";

let pool: Pool | null = null;

// Lazily created so the server can boot before DATABASE_URL is configured.
export function getPool(): Pool {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to backend/.env (see .env.example).");
  }
  if (!pool) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }
  return pool;
}
