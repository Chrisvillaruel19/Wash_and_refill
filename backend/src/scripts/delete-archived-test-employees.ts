import { AccountStatus, Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

async function deleteArchivedTestEmployees() {
  if (process.env.CONFIRM_DELETE_TEST_EMPLOYEES !== "YES") {
    throw new Error(
      "Refusing to delete data. Set CONFIRM_DELETE_TEST_EMPLOYEES=YES to confirm this one-time cleanup."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const employees = await tx.user.findMany({
      where: {
        role: Role.STAFF,
        accountStatus: AccountStatus.ARCHIVED,
      },
      select: { id: true },
    });

    const employeeIds = employees.map((employee) => employee.id);
    if (employeeIds.length === 0) {
      return { employees: 0, orders: 0 };
    }

    const orders = await tx.order.findMany({
      where: { userId: { in: employeeIds } },
      select: { id: true, customerId: true },
    });
    const orderIds = orders.map((order) => order.id);
    const customerIds = [...new Set(orders.map((order) => order.customerId))];

    if (orderIds.length > 0) {
      await tx.inventoryConsumption.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderDetail.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    const shifts = await tx.shiftHandover.findMany({
      where: { userId: { in: employeeIds } },
      select: { id: true },
    });
    const shiftIds = shifts.map((shift) => shift.id);

    if (shiftIds.length > 0) {
      await tx.order.updateMany({
        where: { shiftHandoverId: { in: shiftIds } },
        data: { shiftHandoverId: null },
      });
    }

    await tx.attendance.deleteMany({ where: { userId: { in: employeeIds } } });
    await tx.expense.deleteMany({ where: { userId: { in: employeeIds } } });
    await tx.withdrawal.deleteMany({ where: { userId: { in: employeeIds } } });
    await tx.shiftHandover.deleteMany({ where: { id: { in: shiftIds } } });
    await tx.auditLog.deleteMany({ where: { userId: { in: employeeIds } } });
    await tx.token.deleteMany({ where: { userId: { in: employeeIds } } });
    await tx.user.deleteMany({ where: { id: { in: employeeIds } } });

    if (customerIds.length > 0) {
      await tx.customer.deleteMany({
        where: {
          id: { in: customerIds },
          orders: { none: {} },
        },
      });
    }

    return { employees: employeeIds.length, orders: orderIds.length };
  });

  console.log(
    `Deleted ${result.employees} archived test employees and ${result.orders} related orders.`
  );
}

deleteArchivedTestEmployees()
  .catch((error) => {
    console.error("Archived test employee cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });