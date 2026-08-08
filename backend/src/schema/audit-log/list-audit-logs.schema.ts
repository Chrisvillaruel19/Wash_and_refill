import { z } from "zod";
import { AuditAction } from "../../../generated/prisma/client.js";

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    action: z.enum(AuditAction, { message: "Invalid audit action" }).optional(),
    module: z.string().min(1).optional(),
  }),
});
