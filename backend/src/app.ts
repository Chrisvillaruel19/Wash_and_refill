import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import { ENV } from "./config/env.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));

app.use(cors({
  origin: ENV.FRONTEND_URL,
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