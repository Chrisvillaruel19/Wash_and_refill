import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
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

export default router;
