import { Request, Response } from "express";
import { createShiftHandoverService, listShiftHandoversService } from "../services/shift-handover/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class ShiftHandoverController {
  public create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const result = await createShiftHandoverService(userId, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("ShiftHandoverController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to submit shift handover",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
      const result = await listShiftHandoversService({ page, pageSize });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("ShiftHandoverController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve shift handover records",
      });
    }
  };
}
