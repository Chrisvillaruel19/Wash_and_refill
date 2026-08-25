import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { getBusinessDateOnly } from "../../lib/business-timezone.js";
import { periodBucketKey, PeriodGrouping } from "./period-bucket.util.js";

const expenseRepository = new ExpenseRepository();

// Backend-computed replacement for the frontend's ad-hoc expense totals —
// same layered approach as revenue-trend: one fetch, aggregated in the
// service layer by period, category, and staff.
export async function expenseAnalyticsService(start: Date, end: Date, groupBy: PeriodGrouping) {
  try {
    const expenses = await expenseRepository.findInRange(start, end);

    const trendMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    const byStaffMap = new Map<string, { name: string; total: number }>();
    let totalExpenses = 0;

    for (const expense of expenses) {
      const amount = Number(expense.amount);
      totalExpenses += amount;

      const periodKey = periodBucketKey(getBusinessDateOnly(expense.expenseDate), groupBy);
      trendMap.set(periodKey, (trendMap.get(periodKey) ?? 0) + amount);

      byCategoryMap.set(expense.category, (byCategoryMap.get(expense.category) ?? 0) + amount);

      const staffEntry = byStaffMap.get(expense.userId);
      if (staffEntry) {
        staffEntry.total += amount;
      } else {
        byStaffMap.set(expense.userId, { name: expense.user.name, total: amount });
      }
    }

    const trend = Array.from(trendMap.entries())
      .map(([period, total]) => ({ period, total }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const byStaff = Array.from(byStaffMap.entries())
      .map(([userId, totals]) => ({ userId, ...totals }))
      .sort((a, b) => b.total - a.total);

    return {
      code: 200,
      status: "success",
      message: "Expense analytics retrieved successfully",
      data: { range: { start, end }, groupBy, totalExpenses, trend, byCategory, byStaff },
    };
  } catch (error) {
    console.error("expenseAnalyticsService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve expense analytics",
    };
  }
}
