export const createExpense = (req, res) => {
    return res.json({ message: "Create expense controller working", body: req.body });
};
export const getExpenses = (_req, res) => {
    return res.json({ message: "Get expenses controller working" });
};
export const getExpenseById = (req, res) => {
    return res.json({ message: "Get expense by ID controller working", id: req.params.id });
};
export const updateExpense = (req, res) => {
    return res.json({ message: "Update expense controller working", id: req.params.id, body: req.body });
};
export const deleteExpense = (req, res) => {
    return res.json({ message: "Delete expense controller working", id: req.params.id });
};
export const getExpenseCategories = (_req, res) => {
    return res.json({ message: "Get expense categories controller working" });
};
//# sourceMappingURL=expense.controller.js.map