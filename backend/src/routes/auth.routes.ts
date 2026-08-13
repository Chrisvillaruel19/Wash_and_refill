import { Router } from "express";
import { loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, verifyPasswordSchema } from "../schema/auth/index.js";
import { AuthController } from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";

const router = Router();

const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

router.post(
  "/login",
  validateSchema(loginSchema),
  authController.login
);

router.post(
  "/refresh-token",
  validateSchema(refreshTokenSchema),
  authController.refresh
);

router.post(
  "/logout",
  authController.logout
);

router.post(
  "/forgot-password",
  validateSchema(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validateSchema(resetPasswordSchema),
  authController.resetPassword
);

// Manager-override check (e.g. Staff Inventory's restock re-auth) — must
// already be logged in as someone to call this at all.
router.post(
  "/verify-password",
  authMiddleware.execute,
  validateSchema(verifyPasswordSchema),
  authController.verifyPassword
);

// Server-verified identity for frontend route guards (M8) — see
// AuthController.me for the full rationale.
router.get(
  "/me",
  authMiddleware.execute,
  authController.me
);

export default router;