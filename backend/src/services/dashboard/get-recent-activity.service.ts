import { AuditLogRepository } from "../../repositories/audit-log.repository.js";
import { Role } from "../../../generated/prisma/client.js";

const auditLogRepository = new AuditLogRepository();
const RECENT_ACTIVITY_LIMIT = 10;

// Employee (usernames/emails/roles) and Withdrawal (cash amounts/reasons)
// are genuinely sensitive and Admin-only everywhere else in this app —
// excluded here for non-Admin callers too. Everything else stays visible:
// Staff can already see that data (Inventory, Orders, etc.) through its own
// read endpoints, so hiding its audit trail too wouldn't gain anything.
const ADMIN_ONLY_MODULES = ["Employee", "Withdrawal"];

// Reads directly from AuditLog — every module writes to it via the shared
// writeAuditLog() helper, so this is always a real, live feed, never a
// separate/duplicate logging path of its own.
export async function getRecentActivityService(role: Role | undefined) {
  try {
    const excludeModules = role === Role.ADMIN ? [] : ADMIN_ONLY_MODULES;
    const logs = await auditLogRepository.findRecent(RECENT_ACTIVITY_LIMIT, excludeModules);

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
