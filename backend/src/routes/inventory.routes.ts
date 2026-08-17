import { Router } from "express";
import rateLimit from "express-rate-limit";
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

// Restock Authorization PINs are 4-6 digits — a much smaller keyspace than
// the rest of this app, deliberately, so a Staff member can type one
// quickly. This limiter is the mitigation for that tradeoff: it caps how
// many PIN guesses the restock route can receive from one client in the
// window, on top of restockInventoryService's own PIN verification.
const restockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, status: "error", message: "Too many requests, please try again later." },
});

// Create/update/delete are Admin-only, matching the frontend's Admin-only
// Catalog page. Restock (the actual quantity write) stays open to any
// authenticated user — Staff performs it under their own session, proving
// authorization with the shared Restock Authorization PIN (see
// AuthController.setRestockPin for where an Admin sets it) rather than any
// Admin credential. Reads are open to any authenticated user — both Admin
// and Staff dashboards need inventory data.

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

// Enforced server-side by restockInventoryService verifying the pin
// against every Admin's stored restockPinHash — not by this route trusting
// that the frontend showed an authorization modal first. A direct API call
// with an incorrect PIN is rejected there regardless of what UI (if any)
// called it.
router.post(
  "/:id/restock",
  authMiddleware.execute,
  restockLimiter,
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
