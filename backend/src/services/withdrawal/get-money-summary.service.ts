import { OrderRepository } from "../../repositories/order.repository.js";
import { RefundRepository } from "../../repositories/refund.repository.js";
import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";
import { getBusinessDayRange } from "../../lib/business-timezone.js";
import { getAvailableToWithdraw } from "./earnings.util.js";

const orderRepository = new OrderRepository();
const refundRepository = new RefundRepository();
const withdrawalRepository = new WithdrawalRepository();

const toCents = (n: number) => Math.round(n * 100);

// Today's money in one place, split Cash / GCash, every figure read live
// from the same records the rest of the app uses — so it always agrees with
// Today's Sales (net = sumPaidRevenue) and with the Withdraw window:
//   sales     — payments received today on orders that count as sales
//   refunds   — claimed-order refunds given today (cancelled orders were
//               never sales, so their refunds aren't here)
//   net       — sales − refunds = Today's Sales
//   withdrawn — earnings the Admin took today (refund payouts excluded)
//   available — what can be withdrawn right now (all days, not just today)
export async function getMoneySummaryService() {
  try {
    const today = getBusinessDayRange(new Date());
    const [sales, refunds, withdrawn, available] = await Promise.all([
      orderRepository.sumPaidByMethodInRange(today),
      refundRepository.sumSalesRefundsByMethodInRange(today),
      withdrawalRepository.sumEarningsInRange(today),
      getAvailableToWithdraw(),
    ]);
    const row = (cash: number, gcash: number) => ({
      cash,
      gcash,
      total: (toCents(cash) + toCents(gcash)) / 100,
    });
    return {
      code: 200,
      status: "success",
      message: "Money summary retrieved successfully",
      data: {
        sales: row(sales.cash, sales.gcash),
        refunds: row(refunds.cash, refunds.gcash),
        net: row((toCents(sales.cash) - toCents(refunds.cash)) / 100, (toCents(sales.gcash) - toCents(refunds.gcash)) / 100),
        withdrawn: row(withdrawn.cash, withdrawn.gcash),
        available: row(available.cash.total, available.gcash.total),
      },
    };
  } catch (error) {
    console.error("getMoneySummaryService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve money summary" };
  }
}
