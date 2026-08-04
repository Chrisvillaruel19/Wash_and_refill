import { Router } from "express";
import { EmployeeController } from "../controllers/employee.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  idParamSchema,
} from "../schema/employee/index.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";

const router = Router();

const employeeController = new EmployeeController();
const authMiddleware = new AuthMiddleware();

// Every route here is Admin-only — Employee Management is an Admin-facing
// feature end to end, unlike Order/Attendance/Expense which Staff also
// write to.

router.post(
  "/create",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(createEmployeeSchema),
  employeeController.create
);

router.get("/", authMiddleware.execute, requireRole(Role.ADMIN), employeeController.list);

router.patch(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(updateEmployeeSchema),
  employeeController.update
);

router.patch(
  "/:id/archive",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  employeeController.archive
);

router.patch(
  "/:id/restore",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  employeeController.restore
);

export default router;
