import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import { idParamSchema } from "../schema/attendance/index.js";

const router = Router();
const attendanceController = new AttendanceController();
const authMiddleware = new AuthMiddleware();

// Same pattern as Orders: attendance is a Staff-owned action, not an
// Admin-gated one — every route just requires authentication.

router.post("/clock-in", authMiddleware.execute, attendanceController.clockIn);

// Registered before "/:id" equivalents aren't an issue here since there's
// no other "/:something" route, but kept explicit and first for clarity.
router.get("/active", authMiddleware.execute, attendanceController.getActive);

router.get("/", authMiddleware.execute, attendanceController.list);

router.post(
  "/:id/clock-out",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  attendanceController.clockOut
);

// Admin-only: closes a Staff member's stuck open shift so the next Staff
// member can clock in (see force-clock-out.service.ts).
router.post(
  "/:id/force-clock-out",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  attendanceController.forceClockOut
);

export default router;
