import type { Request, Response } from "express";
import { getPool } from "../config/db";

export function getHealth(req: Request, res: Response) {
  res.json({ status: "ok", uptime: process.uptime() });
}

export async function getDbHealth(req: Request, res: Response) {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    res.status(503).json({ status: "error", error: message });
  }
}
