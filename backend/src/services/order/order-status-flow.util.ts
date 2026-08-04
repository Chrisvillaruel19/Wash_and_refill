import { OrderStatus } from "../../../generated/prisma/client.js";

// Strict, sequential, forward-only — no skipping steps, no going backward.
// CANCELLED is intentionally not reachable through this map at all; it has
// its own dedicated endpoint/service with its own guard (see
// cancel-order.service.ts), separate from ordinary status progression.
const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  [OrderStatus.PENDING]: OrderStatus.IN_PROGRESS,
  [OrderStatus.IN_PROGRESS]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.CLAIMED,
  [OrderStatus.CLAIMED]: null,
  [OrderStatus.CANCELLED]: null,
};

export function isValidStatusTransition(current: OrderStatus, target: OrderStatus): boolean {
  return NEXT_STATUS[current] === target;
}

export function isCancellable(current: OrderStatus): boolean {
  return (
    current === OrderStatus.PENDING ||
    current === OrderStatus.IN_PROGRESS ||
    current === OrderStatus.READY
  );
}
