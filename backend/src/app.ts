import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import { ENV } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = express();

// Required behind any reverse proxy (Render, Railway, Fly, etc.) — without
// this, Express's default `trust proxy: false` makes express-rate-limit
// throw ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request once a proxy
// injects the X-Forwarded-For header, breaking the entire /auth route group.
// `1` trusts exactly one hop (the platform's own edge proxy), matching the
// standard single-proxy topology these hosts use.
app.set("trust proxy", 1);

app.use(helmet());
app.use(morgan(ENV.NODE_ENV === "production" ? "combined" : "dev"));

app.use(cors({
  // Explicit allow-list, not a wildcard — origin-less requests (curl,
  // server-to-server) are allowed through since they carry no cookie
  // credentials to protect in the first place. CORS_ALLOWED_ORIGINS
  // defaults to just FRONTEND_URL, so a single-origin setup behaves
  // exactly as before.
  origin(origin, callback) {
    if (!origin || ENV.CORS_ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// Default 100kb limit is too small for Expense's base64 receipt images
// (a single photo, base64-encoded, easily exceeds it).
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.use('/api', routes);

app.get("/", (req, res) => {
  res.send("API is running");
});

// Liveness (above) only proves the process is up. Readiness here actually
// checks the database — a hosting platform's health probe would otherwise
// report healthy even during a real DB outage (connection pool exhausted,
// Neon unreachable, etc.), since `GET /` never touches Prisma at all.
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

// Catch-all safety net for anything that slips past a controller's own
// try/catch (middleware errors, routing failures) — without this, Express's
// default handler would return an HTML error page instead of JSON.
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    code: 500,
    status: "error",
    message: "Internal server error",
  });
});

export default app;