import { Router } from "express";
import { loginSchema, refreshTokenSchema } from "@/schema/auth";
import { AuthController } from "@/controllers/auth.controller";
import { validateSchema } from "@/middlewares/validate-schema";

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

// router.post(
//   "/logout",
//   authController.logout
// );

// router.post(
//   "/forgot-password",
//   authController.forgotPassword
// );

// router.post(
//   "/reset-password",
//   authController.resetPassword
// );

export default router;