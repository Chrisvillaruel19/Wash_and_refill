import { Router } from "express";
import { getSales, getDailySales, getWeeklySales, getMonthlySales, getUnclaimedSales, } from "../controllers/sales.controller.js";
const router = Router();
router.get("/", getSales);
router.get("/daily", getDailySales);
router.get("/weekly", getWeeklySales);
router.get("/monthly", getMonthlySales);
router.get("/unclaimed", getUnclaimedSales);
export default router;
//# sourceMappingURL=sales.routes.js.map