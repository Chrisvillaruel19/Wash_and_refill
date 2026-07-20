import { Request, Response } from "express";

export const getSales = (_req: Request, res: Response) => {
  return res.json({ message: "Get sales controller working" });
};

export const getDailySales = (_req: Request, res: Response) => {
  return res.json({ message: "Get daily sales controller working" });
};

export const getWeeklySales = (_req: Request, res: Response) => {
  return res.json({ message: "Get weekly sales controller working" });
};

export const getMonthlySales = (_req: Request, res: Response) => {
  return res.json({ message: "Get monthly sales controller working" });
};

export const getUnclaimedSales = (_req: Request, res: Response) => {
  return res.json({ message: "Get unclaimed sales controller working" });
};
