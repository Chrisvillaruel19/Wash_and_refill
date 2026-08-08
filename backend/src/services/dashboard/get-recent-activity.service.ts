import { AuditLogRepository } from "../../repositories/audit-log.repository.js";

const auditLogRepository = new AuditLogRepository();
const RECENT_ACTIVITY_LIMIT = 10;

// Reads directly from AuditLog — every module writes to it via the shared
// writeAuditLog() helper, so this is always a real, live feed, never a
// separate/duplicate logging path of its own.
export async function getRecentActivityService() {
  try {
    const logs = await auditLogRepository.findRecent(RECENT_ACTIVITY_LIMIT);

    const activity = logs.map(({ user, ...log }) => ({
      ...log,
      performedBy: user.name,
    }));

    return {
      code: 200,
      status: "success",
      message: "Recent activity retrieved successfully",
      data: { activity },
    };
  } catch (error) {
    console.error("getRecentActivityService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve recent activity",
    };
  }
}
