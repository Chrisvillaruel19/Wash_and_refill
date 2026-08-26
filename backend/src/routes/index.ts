import { Router } from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import customerRoutes from "./customer.routes.js";
import laundryServiceRoutes from "./laundry-service.routes.js";
import packageRoutes from "./package.routes.js";
import orderRoutes from "./order.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import expenseRoutes from "./expense.routes.js";
import shiftHandoverRoutes from "./shift-handover.routes.js";
import withdrawalRoutes from "./withdrawal.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import auditLogRoutes from "./audit-log.routes.js";

const router = Router();

// Auth routes are the highest-value brute-force/enumeration target
// (login, forgot-password especially) — rate limit the whole group.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, status: "error", message: "Too many requests, please try again later." },
});

router.use("/auth", authLimiter, authRoutes);
router.use("/employee", employeeRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/customers", customerRoutes);
router.use("/laundry-services", laundryServiceRoutes);
router.use("/packages", packageRoutes);
router.use("/orders", orderRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/expenses", expenseRoutes);
router.use("/shift-handover", shiftHandoverRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditLogRoutes);


export default router;