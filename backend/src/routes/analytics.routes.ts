import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import { dateRangeSchema, dateRangeWithGroupingSchema } from "../schema/analytics/index.js";

const router = Router();
const analyticsController = new AnalyticsController();
const authMiddleware = new AuthMiddleware();

// Admin-only across the board — revenue, profit, and per-staff figures are
// business-sensitive in the same way Withdrawals/Audit Logs already are.
// Backend capability only: not yet called by any frontend page (deferred to
// a later phase per this task's explicit scope).
router.get(
  "/revenue/trend",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeWithGroupingSchema),
  analyticsController.revenueTrend
);

router.get(
  "/revenue/by-category",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeSchema),
  analyticsController.revenueByCategory
);

router.get(
  "/revenue/by-staff",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeSchema),
  analyticsController.revenueByStaff
);

router.get(
  "/cash-vs-gcash",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeSchema),
  analyticsController.cashVsGcash
);

router.get(
  "/expenses",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeWithGroupingSchema),
  analyticsController.expenseAnalytics
);

router.get(
  "/profit",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(dateRangeSchema),
  analyticsController.simplifiedProfit
);

export default router;
