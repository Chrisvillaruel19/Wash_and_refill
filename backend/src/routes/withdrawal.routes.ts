import { Router } from "express";
import { WithdrawalController } from "../controllers/withdrawal.controller.js";
import { validateSchema } from "../middlewares/validate-schema.js";
import { AuthMiddleware } from "../middlewares/auth-middleware.js";
import { requireRole } from "../middlewares/require-role.js";
import { mutationLimiter } from "../middlewares/rate-limiters.js";
import { Role } from "../../generated/prisma/client.js";
import { createWithdrawalSchema } from "../schema/withdrawal/index.js";

const router = Router();
const withdrawalController = new WithdrawalController();
const authMiddleware = new AuthMiddleware();

// Admin-only for both create and list — no Staff-side consumer of
// Withdrawal exists in the frontend at all (unlike ShiftHandover/Expense).

router.post(
  "/",
  authMiddleware.execute,
  requireRole(Role.ADMIN),
  mutationLimiter,
  validateSchema(createWithdrawalSchema),
  withdrawalController.create
);

router.get("/", authMiddleware.execute, requireRole(Role.ADMIN), withdrawalController.list);

export default router;
