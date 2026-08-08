import { Request, Response } from "express";
import {
  findOrCreateCustomerService,
  listCustomersService,
  getCustomerService,
  getCustomerByPhoneService,
  updateCustomerService,
  deleteCustomerService,
} from "../services/customer/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class CustomerController {
  public findOrCreate = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const { customerName, phoneNumber } = req.body;
      const result = await findOrCreateCustomerService(actorUserId, { customerName, phoneNumber });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.findOrCreate error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to create or find customer",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const result = await listCustomersService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve customers",
      });
    }
  };

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await getCustomerService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.getById error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve customer",
      });
    }
  };

  public getByPhone = async (req: Request, res: Response) => {
    try {
      const phoneNumber = req.params.phoneNumber as string;
      const result = await getCustomerByPhoneService(phoneNumber);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.getByPhone error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve customer",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const { customerName } = req.body;
      const result = await updateCustomerService(actorUserId, id, customerName);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.update error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update customer",
      });
    }
  };

  public remove = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await deleteCustomerService(actorUserId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.remove error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to remove customer",
      });
    }
  };
}
