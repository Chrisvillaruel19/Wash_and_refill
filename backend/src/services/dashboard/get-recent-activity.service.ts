import { AuditLogRepository } from "../../repositories/audit-log.repository.js";

const auditLogRepository = new AuditLogRepository();
const RECENT_ACTIVITY_LIMIT = 10;

// Reads directly from AuditLog. No module writes to it yet (that's Module
// 10's job) — this correctly returns an empty array until then, and the
// frontend shows its normal empty state. No temporary/duplicate logging
// introduced to make this "look populated" in the meantime.
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
