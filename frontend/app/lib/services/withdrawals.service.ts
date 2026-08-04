// Backend-preparation seam: pages import withdrawal data from here, not
// from localWithdrawals.ts directly. Today this just re-exports the
// localStorage implementation unchanged; once a real API exists, only this
// file's internals need to change, not every page that reads/writes
// withdrawals.
export {
  getStoredWithdrawals,
  addWithdrawal,
} from "../localWithdrawals";
export type { WithdrawalRecord } from "../localWithdrawals";
