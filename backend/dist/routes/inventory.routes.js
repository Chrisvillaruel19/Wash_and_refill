import { Router } from "express";
import { getInventoryItems, getInventoryItemById, updateInventoryItem, restockInventoryItem, getInventoryHistory, } from "../controllers/inventory.controller.js";
const router = Router();
router.get("/", getInventoryItems);
router.get("/:id", getInventoryItemById);
router.patch("/:id", updateInventoryItem);
router.post("/:id/restock", restockInventoryItem);
router.get("/history", getInventoryHistory);
export default router;
//# sourceMappingURL=inventory.routes.js.map