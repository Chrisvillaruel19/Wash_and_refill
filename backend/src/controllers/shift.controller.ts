import { Request, Response } from "express";

export const startShift = (req: Request, res: Response) => {
  return res.json({ message: "Start shift controller working", body: req.body });
};

export const endShift = (req: Request, res: Response) => {
  return res.json({ message: "End shift controller working", body: req.body });
};

export const getCurrentShift = (_req: Request, res: Response) => {
  return res.json({ message: "Get current shift controller working" });
};

export const getShiftHistory = (_req: Request, res: Response) => {
  return res.json({ message: "Get shift history controller working" });
};

export const recordCashCount = (req: Request, res: Response) => {
  return res.json({ message: "Record cash count controller working", body: req.body });
};
