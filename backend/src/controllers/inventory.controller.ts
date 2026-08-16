import { Request, Response } from "express";
import {
  createInventoryService,
  listInventoryService,
  lowStockInventoryService,
  getInventoryService,
  updateInventoryService,
  restockInventoryService,
  requestRestockAuthorizationService,
  deleteInventoryService,
} from "../services/inventory/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class InventoryController {
  public create = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const { itemName, quantity, unit, unitPrice, lowStockThreshold } = req.body;

      const result = await createInventoryService(userId, {
        itemName,
        quantity,
        unit,
        unitPrice,
        lowStockThreshold,
      });

      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to create inventory item",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listInventoryService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve inventory items",
      });
    }
  };

  public lowStock = async (req: Request, res: Response) => {
    try {
      const result = await lowStockInventoryService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.lowStock error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve low stock items",
      });
    }
  };

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await getInventoryService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.getById error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve inventory item",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await updateInventoryService(userId, id, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.update error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update inventory item",
      });
    }
  };

  // Never logs req.body directly (adminUsername/adminPassword live only in
  // this call's stack, passed straight through to the service and nowhere
  // else) — only the generic error branches below, which log the caught
  // Error object, not the request.
  public requestRestockAuthorization = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const { adminUsername, adminPassword } = req.body;
      const result = await requestRestockAuthorizationService(userId, id, adminUsername, adminPassword);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.requestRestockAuthorization error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to authorize restock",
      });
    }
  };

  public restock = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const { quantity, authorizationToken } = req.body;
      const result = await restockInventoryService(userId, id, quantity, authorizationToken);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.restock error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to restock inventory item",
      });
    }
  };

  public remove = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await deleteInventoryService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("InventoryController.remove error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to remove inventory item",
      });
    }
  };
}
