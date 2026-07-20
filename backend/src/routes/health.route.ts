import { Router } from "express";
import { getDbHealth, getHealth } from "../controllers/health.controller";

export const healthRouter = Router();

healthRouter.get("/", getHealth);
healthRouter.get("/db", getDbHealth);
