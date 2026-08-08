import { prisma } from "../../lib/prisma.js";
import { OrderRepository } from "../../repositories/order.repository.js";
import { CustomerRepository } from "../../repositories/customer.repository.js";
import { PackageRepository } from "../../repositories/package.repository.js";
import { LaundryServiceRepository } from "../../repositories/laundry-service.repository.js";
import { InventoryRepository } from "../../repositories/inventory.repository.js";
import { refreshStockStatus } from "../inventory/stock-status.util.js";
import { OrderValidationError, InsufficientStockError } from "./order-errors.js";
import { OrderStatus, PaymentMethod, PaymentStatus, ServiceType, AuditAction } from "../../../generated/prisma/client.js";
import type { OrderItemInput } from "../../schema/order/order-item.schema.js";
import { writeAuditLog } from "../../lib/audit-log.js";

const orderRepository = new OrderRepository();
const customerRepository = new CustomerRepository();
const packageRepository = new PackageRepository();
const laundryServiceRepository = new LaundryServiceRepository();
const inventoryRepository = new InventoryRepository();

export async function createOrderService(input: {
  customerName: string;
  phoneNumber: string;
  paymentMethod?: PaymentMethod;
  amountPaid: number;
  items: OrderItemInput[];
  userId: string;
}) {
  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Find-or-create the customer inside the same transaction — if
      // anything below fails, a brand-new customer row never gets left
      // behind for nothing. Uses upsert (not create-then-catch-P2002, the
      // pattern Customer's own standalone endpoint uses): Postgres aborts
      // the whole transaction after any error, including a unique-
      // constraint violation, so catching it here and continuing on the
      // same tx would break every subsequent query in this transaction.
      // upsert does the whole find-or-create as one atomic query instead.
      const customer = await customerRepository.findOrCreateByPhone(
        { customerName: input.customerName, phoneNumber: input.phoneNumber },
        tx
      );

      // 2. Validate every referenced Package/LaundryService/Inventory row,
      // compute each line's subtotal from its CURRENT price (frozen into
      // OrderDetail.subtotal below — later catalog price changes never
      // touch this order again), and aggregate inventory consumption
      // across all lines (a package's recipe + any direct supply lines)
      // before touching stock at all.
      let totalAmount = 0;
      const orderDetailsToCreate: {
        serviceId?: string;
        serviceType?: ServiceType;
        packageId?: string;
        inventoryId?: string;
        weight?: number;
        quantity: number;
        subtotal: number;
      }[] = [];
      const consumptionDeltas = new Map<string, number>();

      for (const item of input.items) {
        if (item.type === "PACKAGE") {
          const pkg = await packageRepository.findById(item.packageId, tx);
          if (!pkg || !pkg.status) {
            throw new OrderValidationError(`Package not found or inactive: ${item.packageId}`);
          }

          const subtotal = Number(pkg.price) * item.quantity;
          totalAmount += subtotal;
          orderDetailsToCreate.push({ packageId: pkg.id, quantity: item.quantity, subtotal });

          for (const detail of pkg.details) {
            if (!detail.inventory.isActive) {
              throw new OrderValidationError(
                `Package "${pkg.packageName}" references an inactive inventory item`
              );
            }
            const needed = detail.quantity * item.quantity;
            consumptionDeltas.set(
              detail.inventoryId,
              (consumptionDeltas.get(detail.inventoryId) || 0) + needed
            );
          }
        } else if (item.type === "SERVICE") {
          const service = await laundryServiceRepository.findById(item.serviceId, tx);
          if (!service || !service.status) {
            throw new OrderValidationError(`Laundry service not found or inactive: ${item.serviceId}`);
          }

          // Services are priced per kg and never consume Inventory —
          // verified against the frontend's real checkout logic, which
          // ties inventory deduction only to Packages and direct supply
          // sales, never to a Laundry Service line.
          const subtotal = Number(service.price) * item.weight * item.quantity;
          totalAmount += subtotal;
          orderDetailsToCreate.push({
            serviceId: service.id,
            serviceType: item.serviceType,
            weight: item.weight,
            quantity: item.quantity,
            subtotal,
          });
        } else {
          const invItem = await inventoryRepository.findById(item.inventoryId, tx);
          if (!invItem || !invItem.isActive) {
            throw new OrderValidationError(`Inventory item not found or inactive: ${item.inventoryId}`);
          }

          const subtotal = Number(invItem.unitPrice) * item.quantity;
          totalAmount += subtotal;
          orderDetailsToCreate.push({ inventoryId: invItem.id, quantity: item.quantity, subtotal });
          consumptionDeltas.set(
            invItem.id,
            (consumptionDeltas.get(invItem.id) || 0) + item.quantity
          );
        }
      }

      // 3. Atomic, conditional stock decrement per aggregated inventory
      // item — never a plain read-then-write. A count of 0 means there
      // wasn't enough stock, and aborts the whole transaction: no partial
      // order, no partial deduction.
      for (const [inventoryId, amount] of consumptionDeltas) {
        const decremented = await inventoryRepository.decrementIfSufficient(inventoryId, amount, tx);
        if (decremented.count === 0) {
          const item = await inventoryRepository.findById(inventoryId, tx);
          throw new InsufficientStockError(
            `Insufficient stock for ${item?.itemName ?? inventoryId}`
          );
        }

        await refreshStockStatus(inventoryId, tx);
      }

      // 4. Payment status/date computed server-side only — never trusted
      // from the client, same principle already applied to Inventory's
      // stockStatus.
      const paymentStatus = input.amountPaid >= totalAmount ? PaymentStatus.PAID : PaymentStatus.UNPAID;
      const paymentDate = paymentStatus === PaymentStatus.PAID ? new Date() : null;

      // 5. Create the order and its children. Every order starts PENDING —
      // that's a business rule, so it's decided here in the service, not
      // hardcoded inside the repository's create() method.
      const createdOrder = await orderRepository.create(
        {
          customerId: customer.id,
          userId: input.userId,
          status: OrderStatus.PENDING,
          paymentMethod: input.paymentMethod,
          paymentStatus,
          amountPaid: input.amountPaid,
          totalAmount,
          paymentDate,
        },
        tx
      );

      await orderRepository.createOrderDetails(createdOrder.id, orderDetailsToCreate, tx);

      const consumptions = Array.from(consumptionDeltas.entries()).map(
        ([inventoryId, quantityUsed]) => ({ inventoryId, quantityUsed })
      );
      await orderRepository.createConsumptions(createdOrder.id, consumptions, tx);

      await writeAuditLog(tx, {
        userId: input.userId,
        action: AuditAction.CREATE,
        module: "Order",
        description: `Created order for ${input.customerName} (₱${totalAmount.toFixed(2)})`,
        newValue: { customerName: input.customerName, totalAmount, paymentStatus },
      });

      return orderRepository.findById(createdOrder.id, tx);
    });

    return {
      code: 201,
      status: "success",
      message: "Order created successfully",
      data: { order },
    };
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return { code: 400, status: "error", message: error.message };
    }
    if (error instanceof InsufficientStockError) {
      return { code: 409, status: "error", message: error.message };
    }

    console.error("createOrderService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to create order",
    };
  }
}
