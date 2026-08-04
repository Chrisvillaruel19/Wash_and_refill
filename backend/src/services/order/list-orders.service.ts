import { OrderRepository } from "../../repositories/order.repository.js";

const orderRepository = new OrderRepository();

export async function listOrdersService() {
  try {
    const orders = await orderRepository.findAll();

    return {
      code: 200,
      status: "success",
      message: "Orders retrieved successfully",
      data: { orders },
    };
  } catch (error) {
    console.error("listOrdersService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve orders",
    };
  }
}
