import { OrderRepository } from "../../repositories/order.repository.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";

const orderRepository = new OrderRepository();

// Despite the endpoint name (GET /withdrawals/balance, kept as-is — it's
// the only field Admin Sales' "Today's Sales" card reads), this returns
// today's authoritative sales revenue, not the live cash-drawer balance.
// Same PAID + non-CANCELLED + paymentDate + Manila-business-day calculation
// as the Admin Dashboard's "Sales today" (sumPaidRevenue), so the two never
// disagree. getCurrentDrawerBalance (reconciliation.util.ts) is a genuinely
// different figure — the physical cash currently in the drawer — and stays
// exactly as-is for withdrawal creation / available-to-withdraw, which
// still need it; it must not be reused here.
export async function getCurrentBalanceService() {
  try {
    const currentBalance = await orderRepository.sumPaidRevenue(getBusinessDayRange());

    return {
      code: 200,
      status: "success",
      message: "Today's sales retrieved successfully",
      data: { currentBalance },
    };
  } catch (error) {
    console.error("getCurrentBalanceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve today's sales",
    };
  }
}