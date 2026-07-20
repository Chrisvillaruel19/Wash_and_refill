import { Request, Response } from "express";

export const createOrder = (req: Request, res: Response) => {
  return res.json({ message: "Create order controller working", body: req.body });
};

export const getOrders = (_req: Request, res: Response) => {
  return res.json({ message: "Get orders controller working" });
};

export const getOrderById = (req: Request, res: Response) => {
  return res.json({ message: "Get order by ID controller working", id: req.params.id });
};

export const updateOrder = (req: Request, res: Response) => {
  return res.json({ message: "Update order controller working", id: req.params.id, body: req.body });
};

export const processOrderPayment = (req: Request, res: Response) => {
  return res.json({ message: "Process order payment controller working", id: req.params.id, body: req.body });
};
