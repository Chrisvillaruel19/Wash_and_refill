import { Router } from "express";
import { ExpenseController } from "../controllers/expense.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { createExpenseSchema } from "../schema/expense/index.js";

const router = Router();
const expenseController = new ExpenseController();
const authMiddleware = new AuthMiddleware();

// Same pattern as Attendance/Orders: any authenticated user can submit an
// expense. Visibility is scoped inside the service, not gated on the route —
// Staff sees only their own records, Admin sees every record, both via the
// same GET /.

router.post(
  "/",
  authMiddleware.execute,
  validateSchema(createExpenseSchema),
  expenseController.create
);

router.get("/", authMiddleware.execute, expenseController.list);

export default router;
