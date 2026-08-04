import { Request, Response } from "express";
import { listAuditLogsService } from "../services/audit-log/index.js";
import { AuditAction } from "../../generated/prisma/client.js";

export class AuditLogController {
  public list = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
      const action = req.query.action as AuditAction | undefined;
      const module = req.query.module as string | undefined;

      const result = await listAuditLogsService({ page, pageSize, action, module });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AuditLogController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve audit logs",
      });
    }
  };
}
