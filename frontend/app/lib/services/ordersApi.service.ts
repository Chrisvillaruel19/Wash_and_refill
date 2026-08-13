// Real backend source for Order data — the single source every page reads
// orders from (Dashboard, Claim Monitoring, Service, Sales, New Order,
// Shift Handover). The old localStorage-backed orders.service.ts/
// localOrders.ts have been removed; every consumer now goes through here.
import { apiClient } from "../apiClient";
import { Order, OrderStatus, PayStatus, PaymentMethod } from "../../staff/(dashboard)/types";
import { ServiceType } from "../../staff/(dashboard)/neworder/types";

interface BackendOrderDetail {
  quantity: number;
  subtotal: string;
  serviceType: string | null;
  service: { serviceName: string } | null;
  package: { packageName: string } | null;
  inventory: { itemName: string } | null;
}

const SERVICE_TYPE_TO_BACKEND: Record<ServiceType, string> = {
  "Wash & Dry": "WASH_AND_DRY",
  "Wash Only": "WASH_ONLY",
  "Dry Only": "DRY_ONLY",
};

const SERVICE_TYPE_FROM_BACKEND: Record<string, ServiceType> = {
  WASH_AND_DRY: "Wash & Dry",
  WASH_ONLY: "Wash Only",
  DRY_ONLY: "Dry Only",
};

// One entry per OrderDetail line, carrying the real classification +
// subtotal Shift Handover needs to reproduce the backend's own
// summarizeOrders() breakdown exactly — distinct from `items` (Order,
// below), which flattens to a display string and loses type/subtotal.
export interface OrderDetailLine {
  type: "PACKAGE" | "SERVICE" | "INVENTORY";
  name: string;
  quantity: number;
  subtotal: number;
}

function mapOrderDetailLine(detail: BackendOrderDetail): OrderDetailLine {
  const type = detail.package ? "PACKAGE" : detail.service ? "SERVICE" : "INVENTORY";
  const name =
    detail.package?.packageName ?? detail.service?.serviceName ?? detail.inventory?.itemName ?? "Item";
  return { type, name, quantity: detail.quantity, subtotal: Number(detail.subtotal) };
}

interface BackendOrder {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  amountPaid: string;
  totalAmount: string;
  createdAt: string;
  shiftHandoverId: string | null;
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
  const serviceTypeLabel = detail.serviceType ? SERVICE_TYPE_FROM_BACKEND[detail.serviceType] : null;
  const label = serviceTypeLabel ? `${name} (${serviceTypeLabel})` : name;
  return detail.quantity > 1 ? `${label} ×${detail.quantity}` : label;
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
    shiftHandoverId: order.shiftHandoverId,
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

// Same endpoint as getOrderDetail, but returns the typed line items instead
// of the flattened display strings — Shift Handover needs the real
// PACKAGE/SERVICE/INVENTORY classification to reproduce the backend's own
// reconciliation math, not just something to render as text.
export async function getOrderDetailLines(id: string): Promise<OrderDetailLine[]> {
  const result = await apiClient.get<{ order: BackendOrder }>(`/orders/${id}`);
  return (result.order.orderDetails ?? []).map(mapOrderDetailLine);
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
  await apiClient.patch(`/orders/${id}/cancel`);
}

export async function markOrderAsPaid(id: string): Promise<void> {
  await apiClient.patch(`/orders/${id}/mark-paid`);
}

export async function reverseOrderPayment(id: string): Promise<void> {
  await apiClient.patch(`/orders/${id}/reverse-payment`);
}

// Mirrors backend/src/schema/order/order-item.schema.ts's discriminated
// union exactly — one of these three shapes per cart line.
export type NewOrderItemInput =
  | { type: "PACKAGE"; packageId: string; quantity: number }
  | { type: "SERVICE"; serviceId: string; weight: number; quantity: number; serviceType?: ServiceType }
  | { type: "INVENTORY"; inventoryId: string; quantity: number };

export async function createOrder(data: {
  customerName: string;
  phoneNumber: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  items: NewOrderItemInput[];
}): Promise<Order> {
  const items = data.items.map((item) =>
    item.type === "SERVICE" && item.serviceType
      ? { ...item, serviceType: SERVICE_TYPE_TO_BACKEND[item.serviceType] }
      : item
  );
  const { order } = await apiClient.post<{ order: BackendOrder }>("/orders", {
    customerName: data.customerName,
    phoneNumber: data.phoneNumber,
    paymentMethod: PAYMENT_METHOD_MAP_TO_BACKEND[data.paymentMethod],
    amountPaid: data.amountPaid,
    items,
  });
  return mapOrder(order);
}

const PAYMENT_METHOD_MAP_TO_BACKEND: Record<PaymentMethod, string> = {
  Cash: "CASH",
  GCash: "GCASH",
};
