import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import {
  idParamSchema,
  phoneParamSchema,
  findOrCreateCustomerSchema,
  updateCustomerSchema,
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
  validateSchema(findOrCreateCustomerSchema),
  customerController.findOrCreate
);

router.get("/", authMiddleware.execute, customerController.list);

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
