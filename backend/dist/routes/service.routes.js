import { Router } from "express";
import { getServiceOrders, updateOrderStatus, claimOrder, searchOrders, filterOrders, } from "../controllers/service.controller.js";
const router = Router();
router.get("/orders", getServiceOrders);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/claim", claimOrder);
router.get("/search", searchOrders);
router.get("/filter", filterOrders);
export default router;
//# sourceMappingURL=service.routes.js.map