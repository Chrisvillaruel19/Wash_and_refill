import { Request, Response } from "express";
import {
  findOrCreateCustomerService,
  listCustomersService,
  getCustomerService,
  getCustomerByPhoneService,
  updateCustomerService,
  deleteCustomerService,
  listCustomerSummariesService,
  getCustomerProfileService,
} from "../services/customer/index.js";
import { CustomerFilter, CustomerSort } from "../repositories/customer-crm.repository.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class CustomerController {
  // Admin Customers page (CRM) — query already validated by the route.
  public summaries = async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string | undefined>;
      const result = await listCustomerSummariesService({
        search: q.search?.trim() || undefined,
        sort: (q.sort as CustomerSort) ?? "recent",
        filter: (q.filter as CustomerFilter) ?? "all",
        page: Math.max(1, Number(q.page) || 1),
        pageSize: Math.min(100, Math.max(1, Number(q.pageSize) || 20)),
      });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.summaries error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve customers" });
    }
  };

  public profile = async (req: Request, res: Response) => {
    try {
      const result = await getCustomerProfileService(req.params.id as string);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("CustomerController.profile error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Unable to retrieve customer profile" });
    }
  };

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
