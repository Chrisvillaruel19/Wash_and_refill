import { AuditLogRepository } from "../../repositories/audit-log.repository.js";
import { AuditAction } from "../../../generated/prisma/client.js";

const auditLogRepository = new AuditLogRepository();

export async function listAuditLogsService(params: {
  page: number;
  pageSize: number;
  action?: AuditAction;
  module?: string;
}) {
  try {
    const [records, total] = await Promise.all([
      auditLogRepository.findAll(params),
      auditLogRepository.count({ action: params.action, module: params.module }),
    ]);

    const logs = records.map(({ user, ...log }) => ({
      ...log,
      performedBy: user.name,
    }));

    return {
      code: 200,
      status: "success",
      message: "Audit logs retrieved successfully",
      data: {
        logs,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize) || 1,
        },
      },
    };
  } catch (error) {
    console.error("listAuditLogsService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve audit logs",
    };
  }
}
