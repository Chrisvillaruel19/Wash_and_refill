import { Request, Response } from "express";
import {
  LoginService,
  RefreshTokenService,
  LogoutService,
  forgotPasswordService,
  resetPasswordService,
  verifyPasswordService,
  setRestockPinService,
} from "../services/auth/index.js";
import { toMilliseconds, TokenExpiry, JwtPayload } from "../lib/jwt.js";
import { ENV } from "../config/env.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

// maxAge added so the browser's cookie lifetime actually matches the
// refresh token's real 7-day validity, instead of expiring as soon as the
// browser closes. secure/sameSite are driven by ENV.COOKIE_SAMESITE (see
// config/env.ts) rather than hardcoded, so the same build can run same-site
// locally and either same-site or cross-site in production without a code
// change — only an env var.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAMESITE,
  maxAge: toMilliseconds(TokenExpiry.REFRESH_TOKEN_EXPIRES),
};

export class AuthController {
//login method
  public login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const result = await LoginService(username, password);

      if (result.status !== "success" || !result.data) {
        return res.status(result.code ?? 400).json(result);
      }

      const { accessToken, refreshToken } = result.data.tokens;

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

      return res.status(200).json({
        message: "Login successful",
        data: {
          user: result.data.user,
          accessToken,
        },
      });

    } catch(error) {
      console.error("AuthController.login error", error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: "Invalid email or password",
        });
      }

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };

//logout method
  public logout = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const result = await LogoutService(refreshToken);

      if (result.status !== "success") {
        return res.status(result.code ?? 400).json(result);
      }

      res.clearCookie("refreshToken");

      return res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      console.error("AuthController.logout error", error);
      return res.status(500).json({ message: "Unable to logout" });
    }
  };

//forgot password method
  public forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const result = await forgotPasswordService(email);

    return res.status(result.code).json(result);

  } catch (error) {
    console.error("AuthController.forgotPassword error", error);

    return res.status(500).json({
      message: "Unable to process forgot password",
    });
  }
};

//reset password method
  public resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      const result = await resetPasswordService(token, newPassword);

      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AuthController.resetPassword error", error);

      return res.status(500).json({
        message: "Unable to reset password",
      });
    }
  };

//verify-password method (manager-override check — no tokens, no cookies)
  public verifyPassword = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const result = await verifyPasswordService(username, password);

      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AuthController.verifyPassword error", error);

      return res.status(500).json({
        message: "Unable to verify credentials",
      });
    }
  };

// Admin-only (enforced by requireRole(ADMIN) on the route): sets/updates
// the shared Restock Authorization PIN used by restockInventoryService.
// The caller's own verified JWT is the only identity check needed — no
// separate re-authentication, and the PIN itself is never echoed back.
  public setRestockPin = async (req: Request, res: Response) => {
    try {
      const adminUserId = (req as AuthenticatedRequest).user?.sub as string;
      const { pin } = req.body;
      const result = await setRestockPinService(adminUserId, pin);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("AuthController.setRestockPin error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update Restock Authorization PIN",
      });
    }
  };

// Lightweight server-verified identity check (M8): returns the role from
// the *verified* access token (authMiddleware.execute already checked the
// signature before this runs) — not a new authorization decision, just
// exposing what that middleware already established. Frontend route guards
// use this so "does this user get the Admin shell" is answered by the
// server, not by trusting an editable localStorage snapshot from login
// time. Never the source of a real authorization decision itself — every
// actual Admin-only action is still independently enforced by
// requireRole() on its own route, unchanged by this endpoint's existence.
  public me = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    return res.status(200).json({
      code: 200,
      status: "success",
      data: {
        id: authReq.user?.sub,
        role: authReq.user?.role,
      },
    });
  };

//refresh method
  public refresh = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          message: "Refresh token is required",
        });
      }

      const result = await RefreshTokenService(refreshToken);

      if (result.status !== "success" || !result.data) {
        return res.status(result.code ?? 400).json(result);
      }

      const { accessToken, refreshToken: newRefreshToken } = result.data.tokens;

      res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

      return res.status(200).json({
        message: result.message,
        data: {
          accessToken,
        },
      });
    } catch (error) {
      console.error("AuthController.refresh error", error);
      return res.status(500).json({ message: "Unable to refresh token" });
    }
  };

}