import { OrderRepository } from "../../repositories/order.repository.js";
import { summarizeOrders } from "../shift-handover/reconciliation.util.js";

const orderRepository = new OrderRepository();

// Single fetch-and-summarize step shared by revenue-by-category and
// cash-vs-gcash — both want the exact same summarizeOrders() breakdown
// (reconciliation.util.ts, already the established rule for GCash exclusion
// and Package/Service/Inventory categorization) over the same paid,
// non-cancelled orders for a period; this avoids querying twice when a
// caller wants both.
export async function getOrderSummaryForRange(start: Date, end: Date) {
  const orders = await orderRepository.findPaidInRange(start, end);
  return summarizeOrders(orders);
}
