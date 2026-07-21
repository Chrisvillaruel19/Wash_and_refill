import { Request, Response } from "express";

export const createExpense = (req: Request, res: Response) => {
  return res.json({ message: "Create expense controller working", body: req.body });
};

export const getExpenses = (_req: Request, res: Response) => {
  return res.json({ message: "Get expenses controller working" });
};

export const getExpenseById = (req: Request, res: Response) => {
  return res.json({ message: "Get expense by ID controller working", id: req.params.id });
};

export const updateExpense = (req: Request, res: Response) => {
  return res.json({ message: "Update expense controller working", id: req.params.id, body: req.body });
};

export const deleteExpense = (req: Request, res: Response) => {
  return res.json({ message: "Delete expense controller working", id: req.params.id });
};

export const getExpenseCategories = (_req: Request, res: Response) => {
  return res.json({ message: "Get expense categories controller working" });
};
