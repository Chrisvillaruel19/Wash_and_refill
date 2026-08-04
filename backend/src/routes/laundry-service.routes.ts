import { Router } from "express";
import { LaundryServiceController } from "../controllers/laundry-service.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import {
  idParamSchema,
  createLaundryServiceSchema,
  updateLaundryServiceSchema,
} from "../schema/laundry-service/index.js";

const router = Router();
const laundryServiceController = new LaundryServiceController();
const authMiddleware = new AuthMiddleware();

// Create/update/delete are Admin-only, matching the frontend's Admin-only
// Catalog page. Reads are open to any authenticated user — Staff reads the
// service list at checkout (New Order), Admin reads it for management.

router.post(
  "/",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(createLaundryServiceSchema),
  laundryServiceController.create
);

router.get("/", authMiddleware.execute, laundryServiceController.list);

router.get(
  "/:id",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  laundryServiceController.getById
);

router.patch(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(updateLaundryServiceSchema),
  laundryServiceController.update
);

router.delete(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  laundryServiceController.remove
);

export default router;
