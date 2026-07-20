import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
};

if (!env.databaseUrl) {
  console.warn(
    "[env] DATABASE_URL is not set — DB-dependent routes will fail until it's configured in backend/.env"
  );
}
