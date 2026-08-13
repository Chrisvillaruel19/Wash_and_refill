import { Request, Response } from "express";
import {
  clockInService,
  clockOutService,
  listAttendanceService,
  getActiveAttendanceService,
} from "../services/attendance/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class AttendanceController {
  public clockIn = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const result = await clockInService(userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AttendanceController.clockIn error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to clock in",
      });
    }
  };

  public clockOut = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const role = authReq.user?.role;
      const id = req.params.id as string;
      const result = await clockOutService(userId, role, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AttendanceController.clockOut error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to clock out",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listAttendanceService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AttendanceController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve attendance records",
      });
    }
  };

  public getActive = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const result = await getActiveAttendanceService(userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AttendanceController.getActive error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve active attendance record",
      });
    }
  };
}
