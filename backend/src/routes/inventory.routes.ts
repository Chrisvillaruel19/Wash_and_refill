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
  requestRestockAuthorizationSchema,
} from "../schema/inventory/index.js";

const router = Router();
const inventoryController = new InventoryController();
const authMiddleware = new AuthMiddleware();

// Restock's authorization is a 6-digit code (900,000 total values) rather
// than a long opaque token — a smaller keyspace than the rest of this app
// deliberately trades some entropy for a human being able to read and
// retype it. This limiter is the mitigation for that tradeoff: it caps how
// many guesses either restock route can receive from one client in the
// window, on top of the code's own 3-minute expiry and single-use
// enforcement already in the service layer.
const restockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, status: "error", message: "Too many requests, please try again later." },
});

// Create/update/delete are Admin-only, matching the frontend's Admin-only
// Catalog page. Restock (the actual quantity write) stays open to any
// authenticated user — Staff performs it under their own session — but
// generating the authorization code it requires is Admin-only, below.
// Reads are open to any authenticated user — both Admin and Staff
// dashboards need inventory data.

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

// Admin-only: generates a short-lived, single-use, item-scoped code from
// the Admin's OWN authenticated session — no credentials of any kind are
// submitted in the request body, since requireRole(ADMIN) on the caller's
// own JWT is already the proof. The Admin hands this code to a Staff
// member in person; it is not the Admin's password, and Staff never sees
// or enters any Admin credential anywhere in this flow.
router.post(
  "/:id/restock-authorization",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  restockLimiter,
  validateSchema(requestRestockAuthorizationSchema),
  inventoryController.requestRestockAuthorization
);

// Enforced server-side by restockInventoryService verifying
// authorizationCode (item-scoped hash lookup, expiry, single-use) — not by
// this route trusting that the frontend showed an authorization modal
// first. A direct API call without a valid, unexpired, unused code is
// rejected there regardless of what UI (if any) called it.
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
