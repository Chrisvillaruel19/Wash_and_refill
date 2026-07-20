export const startShift = (req, res) => {
    return res.json({ message: "Start shift controller working", body: req.body });
};
export const endShift = (req, res) => {
    return res.json({ message: "End shift controller working", body: req.body });
};
export const getCurrentShift = (_req, res) => {
    return res.json({ message: "Get current shift controller working" });
};
export const getShiftHistory = (_req, res) => {
    return res.json({ message: "Get shift history controller working" });
};
export const recordCashCount = (req, res) => {
    return res.json({ message: "Record cash count controller working", body: req.body });
};
//# sourceMappingURL=shift.controller.js.map