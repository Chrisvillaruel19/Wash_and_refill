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
