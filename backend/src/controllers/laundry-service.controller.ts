import { Request, Response } from "express";
import {
  createLaundryServiceService,
  listLaundryServicesService,
  getLaundryServiceService,
  updateLaundryServiceService,
  deleteLaundryServiceService,
  restoreLaundryServiceService,
} from "../services/laundry-service/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class LaundryServiceController {
  public create = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const { serviceName, itemType, price } = req.body;
      const result = await createLaundryServiceService(userId, { serviceName, itemType, price });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to create laundry service",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listLaundryServicesService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve laundry services",
      });
    }
  };

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await getLaundryServiceService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.getById error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve laundry service",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await updateLaundryServiceService(userId, id, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.update error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update laundry service",
      });
    }
  };

  public remove = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await deleteLaundryServiceService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.remove error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to remove laundry service",
      });
    }
  };

  public restore = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await restoreLaundryServiceService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("LaundryServiceController.restore error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to restore laundry service",
      });
    }
  };
}
