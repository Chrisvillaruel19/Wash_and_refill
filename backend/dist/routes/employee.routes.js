import { Router } from "express";
import { createEmployee, getEmployees, getEmployeeById, updateEmployee, resetEmployeePassword, archiveEmployee, recoverEmployee, } from "../controllers/employee.controller.js";
const router = Router();
router.post("/", createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.patch("/:id", updateEmployee);
router.post("/:id/reset-password", resetEmployeePassword);
router.patch("/:id/archive", archiveEmployee);
router.patch("/:id/recover", recoverEmployee);
export default router;
//# sourceMappingURL=employee.routes.js.map