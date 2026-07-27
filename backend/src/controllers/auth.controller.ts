import { Request, Response } from "express";
import {
  LoginService,
  RefreshTokenService,
  LogoutService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth/index.js";

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

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      return res.status(200).json({
        message: "Login successful",
        data: {
          user: result.data.user,
          accessToken,
        },
      });

    } catch(error) {
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

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

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