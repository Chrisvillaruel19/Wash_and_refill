import { Request, Response } from "express";

export const getLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get logs controller working" });
};

export const getRestockLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get restock logs controller working" });
};

export const getWithdrawalLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get withdrawal logs controller working" });
};

export const getExpenseLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get expense logs controller working" });
};

export const getEditLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get edit logs controller working" });
};

export const getClaimLogs = (_req: Request, res: Response) => {
  return res.json({ message: "Get claim logs controller working" });
};
