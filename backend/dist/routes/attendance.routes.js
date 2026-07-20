import { Router } from "express";
import { timeIn, timeOut, currentAttendance, attendanceHistory, attendanceSummary, } from "../controllers/attendance.controller.js";
const router = Router();
router.post("/time-in", timeIn);
router.post("/time-out", timeOut);
router.get("/current", currentAttendance);
router.get("/history", attendanceHistory);
router.get("/summary", attendanceSummary);
export default router;
//# sourceMappingURL=attendance.routes.js.map