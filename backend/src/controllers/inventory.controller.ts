import { Request, Response } from "express";

export const getInventoryItems = (_req: Request, res: Response) => {
  return res.json({ message: "Get inventory items controller working" });
};

export const getInventoryItemById = (req: Request, res: Response) => {
  return res.json({ message: "Get inventory item by ID controller working", id: req.params.id });
};

export const updateInventoryItem = (req: Request, res: Response) => {
  return res.json({ message: "Update inventory item controller working", id: req.params.id, body: req.body });
};

export const restockInventoryItem = (req: Request, res: Response) => {
  return res.json({ message: "Restock inventory item controller working", id: req.params.id, body: req.body });
};

export const getInventoryHistory = (_req: Request, res: Response) => {
  return res.json({ message: "Get inventory history controller working" });
};
