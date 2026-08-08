import { Request, Response } from "express";
import { createExpenseService, listExpensesService } from "../services/expense/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class ExpenseController {
  public create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const result = await createExpenseService(userId, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("ExpenseController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to record expense",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const role = authReq.user?.role;
      const result = await listExpensesService(userId, role);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("ExpenseController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve expenses",
      });
    }
  };
}
