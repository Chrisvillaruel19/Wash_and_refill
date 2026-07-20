export const getServiceOrders = (_req, res) => {
    return res.json({ message: "Get service orders controller working" });
};
export const updateOrderStatus = (req, res) => {
    return res.json({ message: "Update order status controller working", id: req.params.id, body: req.body });
};
export const claimOrder = (req, res) => {
    return res.json({ message: "Claim order controller working", id: req.params.id });
};
export const searchOrders = (req, res) => {
    return res.json({ message: "Search orders controller working", query: req.query });
};
export const filterOrders = (req, res) => {
    return res.json({ message: "Filter orders controller working", query: req.query });
};
//# sourceMappingURL=service.controller.js.map