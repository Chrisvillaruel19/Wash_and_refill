import { Request, Response } from "express";
import { createWithdrawalService, listWithdrawalsService } from "../services/withdrawal/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class WithdrawalController {
  public create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const result = await createWithdrawalService(userId, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("WithdrawalController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to record withdrawal",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listWithdrawalsService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("WithdrawalController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve withdrawals",
      });
    }
  };
}
