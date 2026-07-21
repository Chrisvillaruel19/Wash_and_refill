import { Request, Response } from "express";

export const login = (req: Request, res: Response) => {
  return res.json({
    message: "Login controller working",
    body: req.body,
  });
};

export const register = (req: Request, res: Response) => {
  return res.json({
    message: "Register controller working",
    body: req.body,
  });
};

export const logout = (req: Request, res: Response) => {
  return res.json({
    message: "Logout controller working",
  });
};

export const forgotPassword = (req: Request, res: Response) => {
  return res.json({
    message: "Forgot password controller working",
    body: req.body,
  });
};

export const verifyOtp = (req: Request, res: Response) => {
  return res.json({
    message: "Verify OTP controller working",
    body: req.body,
  });
};

export const resetPassword = (req: Request, res: Response) => {
  return res.json({
    message: "Reset password controller working",
    body: req.body,
  });
};