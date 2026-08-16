import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import {
  idParamSchema,
  createInventorySchema,
  updateInventorySchema,
  restockInventorySchema,
  requestRestockAuthorizationSchema,
} from "../schema/inventory/index.js";

const router = Router();
const inventoryController = new InventoryController();
const authMiddleware = new AuthMiddleware();

// Create/update/delete are Admin-only, matching the frontend's Admin-only
// Catalog page. Restock stays open to any authenticated user, matching the
// frontend's staff-initiated restock flow. Reads are open to any
// authenticated user — both Admin and Staff dashboards need inventory data.

router.post(
  "/",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(createInventorySchema),
  inventoryController.create
);

router.get("/", authMiddleware.execute, inventoryController.list);

// Registered before "/:id" so it isn't captured as an id param.
router.get("/low-stock", authMiddleware.execute, inventoryController.lowStock);

router.get(
  "/:id",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  inventoryController.getById
);

router.patch(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(updateInventorySchema),
  inventoryController.update
);

// Issues a short-lived, single-use, item-scoped authorization after
// verifying the submitted credentials belong to an ACTIVE Admin. Open to
// any authenticated user (not requireRole(ADMIN)) — it's Staff who calls
// this, verifying someone ELSE's (an Admin's) credentials, not their own
// role. The credentials never reach the actual restock endpoint below.
router.post(
  "/:id/restock-authorization",
  authMiddleware.execute,
  validateSchema(requestRestockAuthorizationSchema),
  inventoryController.requestRestockAuthorization
);

// Enforced server-side by restockInventoryService verifying
// authorizationToken (signature, expiry, staff+item scope, single-use) —
// not by this route trusting that the frontend showed an authorization
// modal first. A direct API call without a valid token is rejected there.
router.post(
  "/:id/restock",
  authMiddleware.execute,
  validateSchema(restockInventorySchema),
  inventoryController.restock
);

router.delete(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  inventoryController.remove
);

export default router;
