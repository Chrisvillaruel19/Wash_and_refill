import { OrderRepository } from "../../repositories/order.repository.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();

// Backend-authoritative "my claimed orders today" — scoped server-side to
// the authenticated caller's userId and the current business day, exactly
// like countClaimedForUserInRange. Never trust a client-supplied userId or
// staffName for this; the id comes only from the verified JWT.
export async function getMyClaimedTodayService(userId: string) {
  try {
    const todayRange = getBusinessDayRange();
    const orders = await orderRepository.findClaimedForUserInRange(userId, todayRange);

    return {
      code: 200,
      status: "success",
      message: "Claimed orders retrieved successfully",
      data: { orders },
    };
  } catch (error) {
    console.error("getMyClaimedTodayService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve claimed orders",
    };
  }
}
