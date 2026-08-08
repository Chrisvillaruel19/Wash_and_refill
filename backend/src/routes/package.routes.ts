import { Router } from "express";
import { PackageController } from "../controllers/package.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { Role } from "../../generated/prisma/client.js";
import { idParamSchema, createPackageSchema, updatePackageSchema } from "../schema/package/index.js";

const router = Router();
const packageController = new PackageController();
const authMiddleware = new AuthMiddleware();

// Create/update/delete are Admin-only, matching the frontend's Admin-only
// Catalog page. Reads are open to any authenticated user — Staff reads the
// package list at checkout (New Order), Admin reads it for management.

router.post(
  "/",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(createPackageSchema),
  packageController.create
);

router.get("/", authMiddleware.execute, packageController.list);

router.get(
  "/:id",
  authMiddleware.execute,
  validateSchema(idParamSchema),
  packageController.getById
);

router.patch(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(updatePackageSchema),
  packageController.update
);

router.delete(
  "/:id",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  validateSchema(idParamSchema),
  packageController.remove
);

export default router;
