import { Router } from "express";
import { createOrder, getOrders, getOrderById, updateOrder, processOrderPayment, } from "../controllers/order.controller.js";
const router = Router();
router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id", updateOrder);
router.post("/:id/payment", processOrderPayment);
export default router;
//# sourceMappingURL=order.routes.js.map