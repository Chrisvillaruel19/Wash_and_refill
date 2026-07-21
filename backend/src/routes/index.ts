import { Router } from "express";
import authRoutes from "@/routes/auth.routes.js";
import employeeRoutes from "@/routes/employee.routes.js";
import attendanceRoutes from "@/routes/attendance.routes.js";
import catalogRoutes from "@/routes/catalog.routes.js";
import orderRoutes from "@/routes/order.routes.js";
import servicesRoutes from "@/routes/service.routes.js";
import inventoryRoutes from "@/routes/inventory.routes.js";
import salesRoutes from "@/routes/sales.routes.js";
import expensesRoutes from "@/routes/expense.routes.js";
import shiftRoutes from "@/routes/shift.routes.js";
import logsRoutes from "@/routes/logs.routes.js";
import reportsRoutes from "@/routes/reports.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/employee", employeeRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/catalog", catalogRoutes);
router.use("/order", orderRoutes);
router.use("/services", servicesRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/sales", salesRoutes);
router.use("/expenses", expensesRoutes);
router.use("/shift", shiftRoutes);
router.use("/logs", logsRoutes);
router.use("/reports", reportsRoutes);

export default router;