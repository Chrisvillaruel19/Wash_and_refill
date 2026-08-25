import { Request, Response } from "express";
import {
  createPackageService,
  listPackagesService,
  getPackageService,
  updatePackageService,
  deletePackageService,
  restorePackageService,
} from "../services/package/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class PackageController {
  public create = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const { packageName, price, color, details } = req.body;
      const result = await createPackageService(userId, { packageName, price, color, details });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to create package",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listPackagesService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve packages",
      });
    }
  };

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await getPackageService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.getById error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve package",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await updatePackageService(userId, id, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.update error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update package",
      });
    }
  };

  public remove = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await deletePackageService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.remove error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to remove package",
      });
    }
  };

  public restore = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await restorePackageService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("PackageController.restore error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to restore package",
      });
    }
  };
}
