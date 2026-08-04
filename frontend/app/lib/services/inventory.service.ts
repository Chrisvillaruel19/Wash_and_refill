// Backend-preparation seam: pages import inventory data from here, not from
// localInventory.ts directly. Today this just re-exports the localStorage
// implementation unchanged; once a real API exists, only this file's
// internals need to change, not every page that reads/writes inventory.
export {
  getStoredInventory,
  getLowStockItems,
  restockItem,
  updateItem,
  addInventoryItem,
  isCriticalInventoryItem,
  applyOrderStockImpact,
  deleteInventoryItem,
} from "../../staff/(dashboard)/localInventory";
