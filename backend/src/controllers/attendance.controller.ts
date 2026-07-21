import { Request, Response } from "express";

export const timeIn = (req: Request, res: Response) => {
  return res.json({ message: "Time in controller working", body: req.body });
};

export const timeOut = (req: Request, res: Response) => {
  return res.json({ message: "Time out controller working", body: req.body });
};

export const currentAttendance = (req: Request, res: Response) => {
  return res.json({ message: "Current attendance controller working" });
};

export const attendanceHistory = (req: Request, res: Response) => {
  return res.json({ message: "Attendance history controller working" });
};

export const attendanceSummary = (req: Request, res: Response) => {
  return res.json({ message: "Attendance summary controller working" });
};
