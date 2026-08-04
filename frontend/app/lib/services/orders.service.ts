// Backend-preparation seam: pages import order data from here, not from
// localOrders.ts directly. Today this just re-exports the localStorage
// implementation unchanged; once a real API exists, only this file's
// internals need to change, not every page that reads/writes orders.
export {
  getStoredOrders,
  addStoredOrder,
  updateOrderStatus,
  cancelOrder,
  computeStatsFromOrders,
} from "../../staff/(dashboard)/localOrders";
