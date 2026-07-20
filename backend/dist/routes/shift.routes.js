import { Router } from "express";
import { startShift, endShift, getCurrentShift, getShiftHistory, recordCashCount, } from "../controllers/shift.controller.js";
const router = Router();
router.post("/start", startShift);
router.post("/end", endShift);
router.get("/current", getCurrentShift);
router.get("/history", getShiftHistory);
router.post("/cash-count", recordCashCount);
export default router;
//# sourceMappingURL=shift.routes.js.map