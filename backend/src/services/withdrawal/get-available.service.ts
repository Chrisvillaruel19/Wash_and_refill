import { getAvailableToWithdraw } from "./earnings.util.js";

// Read-only snapshot for the Cash Withdrawal window — the actual limit is
// re-checked under the drawer lock when a withdrawal is submitted.
export async function getAvailableWithdrawalService() {
  try {
    const available = await getAvailableToWithdraw();
    return {
      code: 200,
      status: "success",
      message: "Available withdrawal amounts retrieved successfully",
      data: available,
    };
  } catch (error) {
    console.error("getAvailableWithdrawalService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve available withdrawal amounts",
    };
  }
}
