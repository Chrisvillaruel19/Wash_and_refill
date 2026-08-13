import { Request, Response } from "express";
import {
  createOrderService,
  listOrdersService,
  getOrderService,
  updateOrderStatusService,
  cancelOrderService,
  markOrderPaidService,
  reverseOrderPaymentService,
} from "../services/order/index.js";
import { JwtPayload } from "../lib/jwt.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class OrderController {
  public create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.sub as string;
      const { customerName, phoneNumber, paymentMethod, amountPaid, items } = req.body;

      const result = await createOrderService({
        customerName,
        phoneNumber,
        paymentMethod,
        amountPaid,
        items,
        userId,
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
      const result = await listOrdersService();
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
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const { status } = req.body;
      const result = await updateOrderStatusService(userId, id, status);
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
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await cancelOrderService(userId, id);
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
      const userId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await markOrderPaidService(userId, id);
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
