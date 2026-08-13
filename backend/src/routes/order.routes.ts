import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { idParamSchema, createOrderSchema, updateOrderStatusSchema } from "../schema/order/index.js";
import { Role } from "../../generated/prisma/client.js";

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

// PATCH, not POST: this mutates existing Order.status exactly like
// /:id/status and /:id/mark-paid do (all three call the same
// orderRepository.updateStatus/updatePaymentStatus pattern) — POST was the
// one inconsistent outlier among Order's state-transition routes.
router.patch(
  "/:id/cancel",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  orderController.cancel
);

// Mark as Paid: Staff or Admin, same as every other Order mutation above.
router.patch(
  "/:id/mark-paid",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  orderController.markAsPaid
);

// Reverse Payment: Admin only — the one Order mutation that IS role-gated,
// since undoing a payment is a correction action, not routine staff work.
router.patch(
  "/:id/reverse-payment",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  orderController.reversePayment
);

export default router;
