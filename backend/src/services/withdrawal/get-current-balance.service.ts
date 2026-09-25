import { getCurrentDrawerBalance } from "../shift-handover/reconciliation.util.js";

export async function getCurrentBalanceService() {
  try {
    const currentBalance = await getCurrentDrawerBalance();

    return {
      code: 200,
      status: "success",
      message: "Current drawer balance retrieved successfully",
      data: { currentBalance },
    };
  } catch (error) {
    console.error("getCurrentBalanceService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve current drawer balance",
    };
  }
}