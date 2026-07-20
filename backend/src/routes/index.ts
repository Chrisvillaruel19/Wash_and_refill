import { Router } from "express";
import { healthRouter } from "./health.route";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);

// Mount feature routers here as they're built, e.g.:
// apiRouter.use("/orders", ordersRouter);
// apiRouter.use("/staff", staffRouter);
