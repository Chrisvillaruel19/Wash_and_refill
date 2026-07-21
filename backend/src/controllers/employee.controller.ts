import { Request, Response } from "express";

export const createEmployee = (req: Request, res: Response) => {
  return res.json({ message: "Create employee controller working", body: req.body });
};

export const getEmployees = (req: Request, res: Response) => {
  return res.json({ message: "Get employees controller working" });
};

export const getEmployeeById = (req: Request, res: Response) => {
  return res.json({ message: "Get employee by ID controller working", id: req.params.id });
};

export const updateEmployee = (req: Request, res: Response) => {
  return res.json({ message: "Update employee controller working", id: req.params.id, body: req.body });
};

export const resetEmployeePassword = (req: Request, res: Response) => {
  return res.json({ message: "Reset employee password controller working", id: req.params.id });
};

export const archiveEmployee = (req: Request, res: Response) => {
  return res.json({ message: "Archive employee controller working", id: req.params.id });
};

export const recoverEmployee = (req: Request, res: Response) => {
  return res.json({ message: "Recover employee controller working", id: req.params.id });
};
