import { Request, Response } from "express";

export const getReports = (_req: Request, res: Response) => {
  return res.json({ message: "Get reports controller working" });
};

export const getSalesReport = (_req: Request, res: Response) => {
  return res.json({ message: "Get sales report controller working" });
};

export const getExpenseReport = (_req: Request, res: Response) => {
  return res.json({ message: "Get expense report controller working" });
};

export const getAttendanceReport = (_req: Request, res: Response) => {
  return res.json({ message: "Get attendance report controller working" });
};
