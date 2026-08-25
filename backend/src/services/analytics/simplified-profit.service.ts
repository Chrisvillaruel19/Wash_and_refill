import { OrderRepository } from "../../repositories/order.repository.js";
import { ExpenseRepository } from "../../repositories/expense.repository.js";

const orderRepository = new OrderRepository();
const expenseRepository = new ExpenseRepository();

// Hard requirement, not polish: this label must travel with the number
// everywhere it's returned, so no caller can display simplifiedProfit
// without also seeing what it excludes. Do not remove or shorten this in a
// way that drops the explicit exclusions.
export const SIMPLIFIED_PROFIT_LABEL =
  "Simplified Profit — Revenue minus recorded expenses; does not include cost of goods, discounts, or refunds.";

// Revenue (Paid, non-Cancelled) minus recorded Expenses for a period. Not
// true accounting profit — see SIMPLIFIED_PROFIT_LABEL, always returned
// alongside the figure.
export async function simplifiedProfitService(start: Date, end: Date) {
  try {
    const range = { start, end };
    const [revenue, expenses] = await Promise.all([
      orderRepository.sumPaidRevenue(range),
      expenseRepository.findInRange(start, end),
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const simplifiedProfit = revenue - totalExpenses;

    return {
      code: 200,
      status: "success",
      message: "Simplified profit retrieved successfully",
      data: {
        range,
        revenue,
        totalExpenses,
        simplifiedProfit,
        label: SIMPLIFIED_PROFIT_LABEL,
      },
    };
  } catch (error) {
    console.error("simplifiedProfitService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve simplified profit",
    };
  }
}
