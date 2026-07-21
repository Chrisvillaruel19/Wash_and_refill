import { Request, Response } from "express";

export const getServiceOrders = (_req: Request, res: Response) => {
  return res.json({ message: "Get service orders controller working" });
};

export const updateOrderStatus = (req: Request, res: Response) => {
  return res.json({ message: "Update order status controller working", id: req.params.id, body: req.body });
};

export const claimOrder = (req: Request, res: Response) => {
  return res.json({ message: "Claim order controller working", id: req.params.id });
};

export const searchOrders = (req: Request, res: Response) => {
  return res.json({ message: "Search orders controller working", query: req.query });
};

export const filterOrders = (req: Request, res: Response) => {
  return res.json({ message: "Filter orders controller working", query: req.query });
};
