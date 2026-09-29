import { Order, OrderStatus } from "../../../staff/(dashboard)/types";

// Shared by the Services table (tablet/desktop) and OrderCard (phones) so
// both always show the same status colours and the same next action.

export const statusBadgeStyles: Record<OrderStatus, string> = {
  Pending: "bg-orange-100 text-orange-700",
  "In progress": "bg-blue-100 text-blue-700",
  Ready: "bg-green-100 text-green-700",
  Claimed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-600",
};

// The one next step staff take for an order at each status. Claimed and
// Cancelled are final — no action.
const advanceLabel: Partial<Record<OrderStatus, string>> = {
  Pending: "Start washing",
  "In progress": "Mark as ready",
  Ready: "Release to customer",
};

export interface OrderActionState {
  canCancel: boolean;
  isUnpaid: boolean;
  // A Ready order can't be released until it's paid (enforced by the
  // backend), so collecting payment becomes the main action at that point.
  needsPaymentToRelease: boolean;
  primary: { kind: "advance" | "collectPayment"; label: string } | null;
}

export function getOrderActionState(order: Order): OrderActionState {
  const canCancel = order.status === "Pending" || order.status === "In progress" || order.status === "Ready";
  const isUnpaid = order.payStatus === "UnPaid" && order.status !== "Cancelled";
  const needsPaymentToRelease = order.status === "Ready" && isUnpaid;
  const label = advanceLabel[order.status];

  return {
    canCancel,
    isUnpaid,
    needsPaymentToRelease,
    primary: needsPaymentToRelease
      ? { kind: "collectPayment", label: "Collect payment" }
      : label
        ? { kind: "advance", label }
        : null,
  };
}

export function primaryButtonClass(kind: "advance" | "collectPayment") {
  return kind === "collectPayment" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700";
}
