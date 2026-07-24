import { Request, Response } from "express";
import { AuthService } from "@/services/auth";

export class AuthController {

  public login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      const { accessToken, refreshToken } = result.tokens;

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      return res.status(200).json({
        message: "Login successful",
        data: {
          user: result.user,
          accessToken
        }
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

}