import { Router } from "express";
import { getLogs, getRestockLogs, getWithdrawalLogs, getExpenseLogs, getEditLogs, getClaimLogs, } from "../controllers/logs.controller.js";
const router = Router();
router.get("/", getLogs);
router.get("/restock", getRestockLogs);
router.get("/withdrawal", getWithdrawalLogs);
router.get("/expense", getExpenseLogs);
router.get("/edit", getEditLogs);
router.get("/claim", getClaimLogs);
export default router;
//# sourceMappingURL=logs.routes.js.map