import { Router } from "express";
import { EmployeeController } from "../controllers/employee.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { createEmployeeSchema } from "../schema/employee/create-employee.schema.js";

const router = Router();

const employeeController = new EmployeeController();


router.post(
  "/create",
  validateSchema(createEmployeeSchema),
  employeeController.create
);


export default router;