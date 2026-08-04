import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { idParamSchema, createOrderSchema, updateOrderStatusSchema } from "../schema/order/index.js";

const router = Router();
const orderController = new OrderController();
const authMiddleware = new AuthMiddleware();

// Unlike Inventory/Customer/Laundry Services/Packages, mutations here are
// NOT Admin-only — verified against the real frontend, where Staff (not
// Admin) creates orders, advances status, and cancels; Admin only reads
// (Claim Monitoring). Every route still requires authentication.

router.post(
  "/",
  authMiddleware.execute,
  validateSchema(createOrderSchema),
  orderController.create
);

router.get("/", authMiddleware.execute, orderController.list);

router.get(
  "/:id",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  orderController.getById
);

router.patch(
  "/:id/status",
  authMiddleware.execute,
  validateSchema(updateOrderStatusSchema),
  orderController.updateStatus
);

router.post(
  "/:id/cancel",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  orderController.cancel
);

export default router;
