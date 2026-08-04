// Backend-preparation seam: pages import expense data from here, not from
// localExpense.ts directly. Today this just re-exports the localStorage
// implementation unchanged; once a real API exists, only this file's
// internals need to change, not every page that reads/writes expenses.
export {
  getStoredExpenses,
  addExpense,
} from "../../staff/(dashboard)/localExpense";
