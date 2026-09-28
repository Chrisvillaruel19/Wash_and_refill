import { Request, Response } from "express";
import {
  createOrderService,
  listOrdersService,
  listMyOrdersService,
  getOrderService,
  updateOrderStatusService,
  cancelOrderService,
  markOrderPaidService,
  reverseOrderPaymentService,
  getSalesBreakdownService,
  getMyClaimedTodayService,
} from "../services/order/index.js";
import { JwtPayload } from "../lib/jwt.js";
import { Role } from "../../generated/prisma/client.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class OrderController {
  public create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const { customerName, phoneNumber, paymentMethod, amountPaid, items, idempotencyKey } = req.body;

      const result = await createOrderService({
        customerName,
        phoneNumber,
        paymentMethod,
        amountPaid,
        items,
        userId,
        idempotencyKey,
        role: authReq.user?.role,
      });

      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.create error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to create order",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
      const result = await listOrdersService({ page, pageSize });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.list error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve orders",
      });
    }
  };

  public listMine = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
      const result = await listMyOrdersService(authReq.user?.sub as string, { page, pageSize });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.listMine error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve orders",
      });
    }
  };

  // Server-side authoritative scope: userId comes only from the verified
  // JWT, never from a client-supplied value — same pattern as every other
  // "mine" lookup in this controller (create/status/cancel/mark-paid all
  // read authReq.user?.sub, never trust the request body/query for it).
  public getMyClaimedToday = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const result = await getMyClaimedTodayService(userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.getMyClaimedToday error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve claimed orders",
      });
    }
  };

  public getSalesBreakdown = async (req: Request, res: Response) => {
    try {
      const { shiftHandoverId, dateFrom, dateTo } = req.query as {
        shiftHandoverId?: string;
        dateFrom?: string;
        dateTo?: string;
      };
      const authReq = req as AuthenticatedRequest;
      const result = await getSalesBreakdownService({
        shiftHandoverId,
        dateFrom,
        dateTo,
        ...(authReq.user?.role === Role.STAFF ? { userId: authReq.user.sub } : {}),
      });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.getSalesBreakdown error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve sales breakdown",
      });
    }
  };

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await getOrderService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.getById error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to retrieve order",
      });
    }
  };

  public updateStatus = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const id = req.params.id as string;
      const { status } = req.body;
      const result = await updateOrderStatusService(userId, id, status, authReq.user?.role);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.updateStatus error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to update order status",
      });
    }
  };

  public cancel = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const id = req.params.id as string;
      const result = await cancelOrderService(userId, id, authReq.user?.role);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.cancel error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to cancel order",
      });
    }
  };

  public markAsPaid = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const id = req.params.id as string;
      const result = await markOrderPaidService(userId, id, authReq.user?.role);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.markAsPaid error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to mark order as paid",
      });
    }
  };

  public reversePayment = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await reverseOrderPaymentService(userId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("OrderController.reversePayment error", error);
      return res.status(500).json({
        code: 500,
        status: "error",
        message: "Unable to reverse payment",
      });
    }
  };
}
