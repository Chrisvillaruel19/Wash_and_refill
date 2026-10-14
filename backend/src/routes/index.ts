import { Router } from "express";
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

// The brute-force limiter (authLimiter) is applied per route in
// auth.routes.ts to the endpoints that take a guessable secret — not to the
// whole group, where every session check/refresh/logout spent the same
// 20-per-15-minutes budget as login and normal browsing locked users out.
router.use("/auth", authRoutes);
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