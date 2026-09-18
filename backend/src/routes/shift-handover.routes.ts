import { Router } from "express";
import { ShiftHandoverController } from "../controllers/shift-handover.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import {
  createShiftHandoverSchema,
  listShiftHandoversSchema,
  updateDrawerSettingsSchema,
} from "../schema/shift-handover/index.js";

const router = Router();
const shiftHandoverController = new ShiftHandoverController();
const authMiddleware = new AuthMiddleware();

// Create is Staff-owned (any authenticated user), same as Attendance/Orders.
// List is intentionally NOT role-scoped, unlike Expenses — one shared
// physical drawer means the full handover history is shared system state,
// not private per-user data.

router.post(
  "/",
  authMiddleware.execute,
  validateSchema(createShiftHandoverSchema),
  shiftHandoverController.create
);

router.get(
  "/",
  authMiddleware.execute,
  validateSchema(listShiftHandoversSchema),
  shiftHandoverController.list
);

// Admin-only starting-cash configuration (Phase 8/9). A literal sub-path,
// not an :id param, so no ordering conflict with the routes above.
router.patch(
  "/drawer-settings",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(updateDrawerSettingsSchema),
  shiftHandoverController.updateDrawerSettings
);

export default router;
