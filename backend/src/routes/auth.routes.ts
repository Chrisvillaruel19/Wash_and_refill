import { Router } from "express";
import { loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from "../schema/auth/index.js";
import { AuthController } from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";

const router = Router();

const authController = new AuthController();

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

export default router;