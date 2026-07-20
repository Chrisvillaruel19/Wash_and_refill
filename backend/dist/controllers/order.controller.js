export const createOrder = (req, res) => {
    return res.json({ message: "Create order controller working", body: req.body });
};
export const getOrders = (_req, res) => {
    return res.json({ message: "Get orders controller working" });
};
export const getOrderById = (req, res) => {
    return res.json({ message: "Get order by ID controller working", id: req.params.id });
};
export const updateOrder = (req, res) => {
    return res.json({ message: "Update order controller working", id: req.params.id, body: req.body });
};
export const processOrderPayment = (req, res) => {
    return res.json({ message: "Process order payment controller working", id: req.params.id, body: req.body });
};
//# sourceMappingURL=order.controller.js.map