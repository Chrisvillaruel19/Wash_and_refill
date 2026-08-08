import { OrderRepository } from "../../repositories/order.repository.js";

const orderRepository = new OrderRepository();

export async function getOrderService(id: string) {
  try {
    const order = await orderRepository.findById(id);

    if (!order) {
      return {
        code: 404,
        status: "error",
        message: "Order not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Order retrieved successfully",
      data: { order },
    };
  } catch (error) {
    console.error("getOrderService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve order",
    };
  }
}
