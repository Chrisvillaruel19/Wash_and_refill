import { Request, Response } from "express";
import {
  revenueTrendService,
  revenueByCategoryService,
  revenueByStaffService,
  cashVsGcashService,
  expenseAnalyticsService,
  simplifiedProfitService,
  RevenueTrendGrouping,
} from "../services/analytics/index.js";
import { getBusinessDayRange } from "../lib/business-timezone.js";

// Shared by every handler below: 'from'/'to' are already-validated
// YYYY-MM-DD Manila calendar dates (schema/analytics) — this turns them
// into the real UTC instant bounds spanning the full period, using the same
// getBusinessDayRange helper the dashboard fix uses for a single day.
function resolveRange(from: string, to: string): { start: Date; end: Date } {
  return {
    start: getBusinessDayRange(new Date(from)).start,
    end: getBusinessDayRange(new Date(to)).end,
  };
}

export class AnalyticsController {
  public revenueTrend = async (req: Request, res: Response) => {
    try {
      const { from, to, groupBy } = req.query as unknown as {
        from: string;
        to: string;
        groupBy: RevenueTrendGrouping;
      };
      const { start, end } = resolveRange(from, to);
      const result = await revenueTrendService(start, end, groupBy);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.revenueTrend error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue trend" });
    }
  };

  public revenueByCategory = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as unknown as { from: string; to: string };
      const { start, end } = resolveRange(from, to);
      const result = await revenueByCategoryService(start, end);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.revenueByCategory error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue by category" });
    }
  };

  public revenueByStaff = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as unknown as { from: string; to: string };
      const { start, end } = resolveRange(from, to);
      const result = await revenueByStaffService(start, end);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.revenueByStaff error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve revenue by staff" });
    }
  };

  public cashVsGcash = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as unknown as { from: string; to: string };
      const { start, end } = resolveRange(from, to);
      const result = await cashVsGcashService(start, end);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.cashVsGcash error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve cash vs GCash breakdown" });
    }
  };

  public expenseAnalytics = async (req: Request, res: Response) => {
    try {
      const { from, to, groupBy } = req.query as unknown as {
        from: string;
        to: string;
        groupBy: RevenueTrendGrouping;
      };
      const { start, end } = resolveRange(from, to);
      const result = await expenseAnalyticsService(start, end, groupBy);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.expenseAnalytics error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve expense analytics" });
    }
  };

  public simplifiedProfit = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as unknown as { from: string; to: string };
      const { start, end } = resolveRange(from, to);
      const result = await simplifiedProfitService(start, end);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AnalyticsController.simplifiedProfit error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve simplified profit" });
    }
  };
}
