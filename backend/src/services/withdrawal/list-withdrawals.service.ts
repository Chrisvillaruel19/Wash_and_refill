import { WithdrawalRepository } from "../../repositories/withdrawal.repository.js";

const withdrawalRepository = new WithdrawalRepository();

// Admin-only (route-gated) — no Staff-side consumer of Withdrawal exists in
// the frontend, unlike ShiftHandover/Expense.
export async function listWithdrawalsService() {
  try {
    const records = await withdrawalRepository.findAll();

    const withdrawals = records.map(({ user, ...record }) => ({
      ...record,
      performedBy: user.name,
    }));

    return {
      code: 200,
      status: "success",
      message: "Withdrawals retrieved successfully",
      data: { withdrawals },
    };
  } catch (error) {
    console.error("listWithdrawalsService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve withdrawals",
    };
  }
}
