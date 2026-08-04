import { Request, Response } from "express";
import {
  getAdminDashboardService,
  getStaffDashboardService,
  getRecentActivityService,
} from "../services/dashboard/index.js";

export class DashboardController {
  public admin = async (req: Request, res: Response) => {
    try {
      const result = await getAdminDashboardService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("DashboardController.admin error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve admin dashboard statistics",
      });
    }
  };

  public staff = async (req: Request, res: Response) => {
    try {
      const result = await getStaffDashboardService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("DashboardController.staff error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve staff dashboard statistics",
      });
    }
  };

  public activity = async (req: Request, res: Response) => {
    try {
      const result = await getRecentActivityService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("DashboardController.activity error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve recent activity",
      });
    }
  };
}
