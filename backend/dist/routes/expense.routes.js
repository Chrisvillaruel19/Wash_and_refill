import { Router } from "express";
import { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, getExpenseCategories, } from "../controllers/expense.controller.js";
const router = Router();
router.post("/", createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);
router.get("/expense-categories", getExpenseCategories);
export default router;
//# sourceMappingURL=expense.routes.js.map