import { prisma } from "../../lib/prisma.js";
import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";

const shiftHandoverRepository = new ShiftHandoverRepository();

const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);

// Admin Sales' Cashier Shift Summary: one row per staff member who ever
// submitted a handover — how many shifts, the latest one, total sales and
// the net over/short across all of them (counted − expected). Each row
// opens that staff member's own handovers (GET /shift-handover?userId=).
export async function getStaffShiftSummaryService() {
  try {
    const groups = await shiftHandoverRepository.summarizeByStaff();
    const users = await prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));

    const staff = groups
      .map((g) => ({
        userId: g.userId,
        staffName: nameOf.get(g.userId) ?? "Unknown",
        shifts: g._count._all,
        lastShift: g._max.endTime,
        totalSales:
          (cents(g._sum.laundryEarnings) + cents(g._sum.supplySales) + cents(g._sum.customServiceSales)) / 100,
        overShort: (cents(g._sum.actualCashCount) - cents(g._sum.expectedBalance)) / 100,
      }))
      .sort((a, b) => (b.lastShift?.getTime() ?? 0) - (a.lastShift?.getTime() ?? 0));

    return {
      code: 200,
      status: "success",
      message: "Staff shift summary retrieved successfully",
      data: { staff },
    };
  } catch (error) {
    console.error("getStaffShiftSummaryService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve the staff shift summary" };
  }
}
