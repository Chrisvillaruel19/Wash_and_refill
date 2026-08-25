import { ExpenseRepository } from "../../repositories/expense.repository.js";
import { Role } from "../../../generated/prisma/client.js";

const expenseRepository = new ExpenseRepository();

// Scope is a business rule, not a route gate: Admin sees every expense,
// Staff sees only their own. Both hit the same endpoint.
export async function listExpensesService(
  userId: string,
  role: Role | undefined,
  params: { page: number; pageSize: number }
) {
  try {
    const [records, total] =
      role === Role.ADMIN
        ? await Promise.all([expenseRepository.findAll(params), expenseRepository.count()])
        : await Promise.all([
            expenseRepository.findAllForUser(userId, params),
            expenseRepository.countForUser(userId),
          ]);

    // Derived at read time from the User relation — never a stored column,
    // never client-supplied.
    const expenses = records.map(({ user, ...expense }) => ({
      ...expense,
      submittedBy: user.name,
    }));

    return {
      code: 200,
      status: "success",
      message: "Expenses retrieved successfully",
      data: {
        expenses,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize) || 1,
        },
      },
    };
  } catch (error) {
    console.error("listExpensesService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve expenses",
    };
  }
}
