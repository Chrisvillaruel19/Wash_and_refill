import { OrderRepository } from "../../repositories/order.repository.js";

const orderRepository = new OrderRepository();

export async function listOrdersService(params: { page: number; pageSize: number }) {
  try {
    const [orders, total] = await Promise.all([
      orderRepository.findAll(params),
      orderRepository.count(),
    ]);

    return {
      code: 200,
      status: "success",
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize) || 1,
        },
      },
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
