import { Router } from "express";
import {
  getReports,
  getSalesReport,
  getExpenseReport,
  getAttendanceReport,
} from "@/controllers/reports.controller.js";

const router = Router();

router.get("/", getReports);
router.get("/sales", getSalesReport);
router.get("/expenses", getExpenseReport);
router.get("/attendance", getAttendanceReport);

export default router;
