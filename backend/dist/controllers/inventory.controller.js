export const getInventoryItems = (_req, res) => {
    return res.json({ message: "Get inventory items controller working" });
};
export const getInventoryItemById = (req, res) => {
    return res.json({ message: "Get inventory item by ID controller working", id: req.params.id });
};
export const updateInventoryItem = (req, res) => {
    return res.json({ message: "Update inventory item controller working", id: req.params.id, body: req.body });
};
export const restockInventoryItem = (req, res) => {
    return res.json({ message: "Restock inventory item controller working", id: req.params.id, body: req.body });
};
export const getInventoryHistory = (_req, res) => {
    return res.json({ message: "Get inventory history controller working" });
};
//# sourceMappingURL=inventory.controller.js.map