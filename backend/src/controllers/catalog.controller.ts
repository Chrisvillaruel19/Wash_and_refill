import { Request, Response } from "express";

export const createSupply = (req: Request, res: Response) => {
  return res.json({ message: "Create supply controller working", body: req.body });
};

export const getSupplies = (_req: Request, res: Response) => {
  return res.json({ message: "Get supplies controller working" });
};

export const getSupplyById = (req: Request, res: Response) => {
  return res.json({ message: "Get supply by ID controller working", id: req.params.id });
};

export const updateSupply = (req: Request, res: Response) => {
  return res.json({ message: "Update supply controller working", id: req.params.id, body: req.body });
};

export const deleteSupply = (req: Request, res: Response) => {
  return res.json({ message: "Delete supply controller working", id: req.params.id });
};

export const restockSupply = (req: Request, res: Response) => {
  return res.json({ message: "Restock supply controller working", id: req.params.id, body: req.body });
};

export const getLowStockSupplies = (_req: Request, res: Response) => {
  return res.json({ message: "Get low stock supplies controller working" });
};

export const createPackage = (req: Request, res: Response) => {
  return res.json({ message: "Create package controller working", body: req.body });
};

export const getPackages = (_req: Request, res: Response) => {
  return res.json({ message: "Get packages controller working" });
};

export const getPackageById = (req: Request, res: Response) => {
  return res.json({ message: "Get package by ID controller working", id: req.params.id });
};

export const updatePackage = (req: Request, res: Response) => {
  return res.json({ message: "Update package controller working", id: req.params.id, body: req.body });
};

export const deletePackage = (req: Request, res: Response) => {
  return res.json({ message: "Delete package controller working", id: req.params.id });
};

export const addPackageItems = (req: Request, res: Response) => {
  return res.json({ message: "Add package items controller working", id: req.params.id, body: req.body });
};

export const createLaundryService = (req: Request, res: Response) => {
  return res.json({ message: "Create laundry service controller working", body: req.body });
};

export const getLaundryServices = (_req: Request, res: Response) => {
  return res.json({ message: "Get laundry services controller working" });
};

export const getLaundryServiceById = (req: Request, res: Response) => {
  return res.json({ message: "Get laundry service by ID controller working", id: req.params.id });
};

export const updateLaundryService = (req: Request, res: Response) => {
  return res.json({ message: "Update laundry service controller working", id: req.params.id, body: req.body });
};

export const deleteLaundryService = (req: Request, res: Response) => {
  return res.json({ message: "Delete laundry service controller working", id: req.params.id });
};
