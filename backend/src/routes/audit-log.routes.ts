import { Router } from "express";
import { AuditLogController } from "../controllers/audit-log.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import { listAuditLogsSchema } from "../schema/audit-log/index.js";

const router = Router();
const auditLogController = new AuditLogController();
const authMiddleware = new AuthMiddleware();

// Admin-only, full browsable/filterable audit trail — distinct from
// Module 9's GET /dashboard/activity, which stays a lightweight, unfiltered
// "most recent 10" feed open to any authenticated user.
router.get(
  "/",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(listAuditLogsSchema),
  auditLogController.list
);

export default router;
