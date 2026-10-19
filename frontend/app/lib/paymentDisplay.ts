import { Order } from "../staff/(dashboard)/types";

// What every screen shows about an order's money, in one place so they all
// agree. Refund rules (enforced by the server): a cancelled paid order is
// refunded in full; a claimed one can be refunded partly or fully (e.g.
// damaged items); nothing else is refundable.
export type PaymentTone = "paid" | "unpaid" | "refunded" | "awaitingRefund" | "partiallyRefunded";

type OrderMoney = Pick<Order, "payStatus" | "status" | "amount" | "refundedAmount">;

// A cancelled order the customer paid for: they're owed the full amount,
// and only the Admin can refund it (Laundry Monitoring → Refund).
export function isAwaitingRefund(order: Pick<Order, "payStatus" | "status">): boolean {
  return order.status === "Cancelled" && order.payStatus === "Paid";
}

export function paymentTone(order: OrderMoney): PaymentTone {
  if (isAwaitingRefund(order)) return "awaitingRefund";
  if (order.payStatus === "Paid" && order.refundedAmount > 0) return "partiallyRefunded";
  if (order.payStatus === "UnPaid") return "unpaid";
  return order.payStatus === "Refunded" ? "refunded" : "paid";
}

// The one payment label every screen shows for an order.
export function paymentLabel(order: OrderMoney): string {
  switch (paymentTone(order)) {
    // Says "Paid" too: the customer did pay — the money just hasn't gone back yet.
    case "awaitingRefund":
      return "Paid · Awaiting refund";
    case "partiallyRefunded":
      return `Partially refunded · ₱${Math.max(0, order.amount - order.refundedAmount).toFixed(2)} left`;
    case "unpaid":
      return "Unpaid";
    case "refunded":
      return "Refunded";
    default:
      return "Paid";
  }
}

// Text color per tone (plain labels).
export const PAYMENT_TEXT_CLASS: Record<PaymentTone, string> = {
  paid: "text-green-600",
  unpaid: "text-red-500",
  refunded: "text-gray-500",
  awaitingRefund: "text-amber-600",
  partiallyRefunded: "text-amber-600",
};

// Badge colors per tone (pill-shaped labels).
export const PAYMENT_BADGE_CLASS: Record<PaymentTone, string> = {
  paid: "text-green-600 border-green-300 bg-green-50",
  unpaid: "text-red-600 border-red-300 bg-red-50",
  refunded: "text-gray-500 border-gray-300 bg-gray-50",
  awaitingRefund: "text-amber-700 border-amber-300 bg-amber-50",
  partiallyRefunded: "text-amber-700 border-amber-300 bg-amber-50",
};

export const AWAITING_REFUND_HINT =
  "Cancelled after payment — keep the cash set aside. Give it to the customer once the Admin marks it Refunded.";

// A cancelled order the Admin has refunded: for cash, Staff now hand the
// set-aside money to the customer.
export const REFUNDED_CANCELLED_HINT = "Refund approved — give the set-aside cash to the customer.";

// What Staff need to know about a refunded or refundable order — shown in the
// Services Action column. A cancelled order is always refunded the way it
// was paid (the server enforces it), so the method is the payment method.
export function cancelledRefundAction(
  order: Pick<Order, "payStatus" | "status" | "paymentMethod" | "amount" | "refundedAmount" | "refundMethods">
): { text: string; tone: "pending" | "done" } | null {
  // A claimed order's refund is the Admin's alone (paid from the shop's
  // earnings) — Staff are just told it happened; nothing for them to do.
  if (order.status === "Claimed" && order.refundedAmount > 0) {
    const via = order.refundMethods?.length ? ` via ${order.refundMethods.join(" + ")}` : "";
    return {
      text: `Admin refunded ₱${order.refundedAmount.toFixed(2)}${via} — nothing to do`,
      tone: "done",
    };
  }
  if (order.status !== "Cancelled" || order.payStatus === "UnPaid") return null;
  const amount = `₱${order.amount.toFixed(2)}`;
  const gcash = order.paymentMethod === "GCash";
  if (order.payStatus === "Refunded") {
    return gcash
      ? { text: `Refunded ${amount} via GCash`, tone: "done" }
      : { text: `Refunded by cash — give the set-aside ${amount} to the customer`, tone: "done" };
  }
  return gcash
    ? { text: `Admin will refund ${amount} via GCash`, tone: "pending" }
    : { text: `Keep ${amount} cash aside until Refunded`, tone: "pending" };
}

// The hover hint to show on a payment label, if any.
export function paymentHint(order: Pick<Order, "payStatus" | "status" | "paymentMethod">): string | undefined {
  if (isAwaitingRefund(order)) return AWAITING_REFUND_HINT;
  if (order.status === "Cancelled" && order.payStatus === "Refunded" && order.paymentMethod !== "GCash") {
    return REFUNDED_CANCELLED_HINT;
  }
  return undefined;
}
