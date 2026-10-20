import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireActiveShift } from "../middlewares/require-active-shift.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import {
  idParamSchema,
  phoneParamSchema,
  findOrCreateCustomerSchema,
  updateCustomerSchema,
  listCustomerSummariesSchema,
} from "../schema/customer/index.js";

const router = Router();
const customerController = new CustomerController();
const authMiddleware = new AuthMiddleware();

// Create/read/update are open to any authenticated user — Staff creates and
// looks up customers routinely at checkout. Delete is Admin-only, the same
// split established for Inventory.

router.post(
  "/",
  authMiddleware.execute,
  requireActiveShift,
  validateSchema(findOrCreateCustomerSchema),
  customerController.findOrCreate
);

router.get("/", authMiddleware.execute, customerController.list);

// Admin Customers page (CRM): totals per customer and a profile with every
// order. Registered before "/:id" so "summaries" isn't taken as an id.
router.get(
  "/summaries",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(listCustomerSummariesSchema),
  customerController.summaries
);
router.get(
  "/:id/profile",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  customerController.profile
);


// Registered before "/:id" so it isn't captured as an id param.
router.get(
  "/by-phone/:phoneNumber",
  authMiddleware.execute,
  validateSchema(phoneParamSchema),
  customerController.getByPhone
);

router.get(
  "/:id",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  customerController.getById
);

router.patch(
  "/:id",
  authMiddleware.execute,
  requireActiveShift,
  validateSchema(updateCustomerSchema),
  customerController.update
);

router.delete(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  customerController.remove
);

export default router;
