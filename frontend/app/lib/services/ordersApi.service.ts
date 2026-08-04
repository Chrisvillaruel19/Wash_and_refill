// Real backend source for Order data. Deliberately separate from
// orders.service.ts (which still wraps localOrders.ts unchanged) — that
// file is shared by pages not integrated yet (New Order, Service, Sales),
// and touching it now would risk breaking them before their own phase.
// Future integration phases for those pages should consume this file too,
// and orders.service.ts itself can be pointed here once every consumer is
// ready, rather than each page reimplementing this mapping separately.
import { apiClient } from "../apiClient";
import { Order, OrderStatus, PayStatus, PaymentMethod } from "../../staff/(dashboard)/types";

interface BackendOrderDetail {
  quantity: number;
  service: { serviceName: string } | null;
  package: { packageName: string } | null;
  inventory: { itemName: string } | null;
}

interface BackendOrder {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  amountPaid: string;
  totalAmount: string;
  createdAt: string;
  customer: { customerName: string; phoneNumber: string };
  user?: { id: string; name: string };
  orderDetails?: BackendOrderDetail[];
}

const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  READY: "Ready",
  CLAIMED: "Claimed",
  CANCELLED: "Cancelled",
};

const PAY_STATUS_MAP: Record<string, PayStatus> = {
  PAID: "Paid",
  UNPAID: "UnPaid",
};

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  CASH: "Cash",
  GCASH: "GCash",
};

const STATUS_TO_BACKEND: Record<OrderStatus, string> = {
  Pending: "PENDING",
  "In progress": "IN_PROGRESS",
  Ready: "READY",
  Claimed: "CLAIMED",
  Cancelled: "CANCELLED",
};

// One display string per OrderDetail line, in the same "Name" / "Name ×N"
// shape groupItems() already expects (see lib/groupItems.ts) — self-groups
// on render, so a plain one-string-per-line list is sufficient here.
function mapOrderDetail(detail: BackendOrderDetail): string {
  const name =
    detail.package?.packageName ?? detail.service?.serviceName ?? detail.inventory?.itemName ?? "Item";
  return detail.quantity > 1 ? `${name} ×${detail.quantity}` : name;
}

function mapOrder(order: BackendOrder): Order {
  const created = new Date(order.createdAt);
  return {
    id: order.id,
    customer: order.customer.customerName,
    contact: order.customer.phoneNumber,
    time: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: created.toLocaleDateString(),
    amount: Number(order.totalAmount),
    payStatus: PAY_STATUS_MAP[order.paymentStatus] ?? "UnPaid",
    status: STATUS_MAP[order.status] ?? "Pending",
    items: order.orderDetails?.map(mapOrderDetail),
    staffName: order.user?.name,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod ? PAYMENT_METHOD_MAP[order.paymentMethod] : undefined,
  };
}

export async function getOrders(): Promise<Order[]> {
  const result = await apiClient.get<{ orders: BackendOrder[] }>("/orders");
  return result.orders.map(mapOrder);
}

// GET /orders (list) deliberately omits orderDetails to stay lean — this
// hits GET /orders/:id (already built for exactly this purpose) to get the
// full line-item detail for one order. Callers needing items for a bounded
// set of orders (e.g. one visible page) should call this per-id rather than
// requesting it for the whole list.
export async function getOrderDetail(id: string): Promise<Order> {
  const result = await apiClient.get<{ order: BackendOrder }>(`/orders/${id}`);
  return mapOrder(result.order);
}

// The status-update/cancel responses come from a plain repository .update()
// with no relation include, so they lack customer/user — mapOrder would
// crash on order.customer.customerName if applied here. Callers should
// treat these as fire-and-refetch (call getOrders() again after success),
// same pattern as Expense/Withdrawal/Attendance create responses.
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await apiClient.patch(`/orders/${id}/status`, { status: STATUS_TO_BACKEND[status] });
}

export async function cancelOrder(id: string): Promise<void> {
  await apiClient.post(`/orders/${id}/cancel`);
}
