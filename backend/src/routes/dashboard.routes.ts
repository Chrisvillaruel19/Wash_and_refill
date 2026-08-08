import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";

const router = Router();
const dashboardController = new DashboardController();
const authMiddleware = new AuthMiddleware();

// Admin's dashboard is Admin-only, matching the frontend's Admin-gated
// route. Staff's dashboard and the shared Recent Activity feed are open to
// any authenticated user — both frontend dashboards render the same
// activity widget.

router.get("/admin", authMiddleware.execute, requireRole(Role.ADMIN), dashboardController.admin);
router.get("/staff", authMiddleware.execute, dashboardController.staff);
router.get("/activity", authMiddleware.execute, dashboardController.activity);

export default router;
