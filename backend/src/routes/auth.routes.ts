import { Router } from "express";
import {
  login,
  register,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "@/controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;