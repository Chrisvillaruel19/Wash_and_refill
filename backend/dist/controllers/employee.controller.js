export const createEmployee = (req, res) => {
    return res.json({ message: "Create employee controller working", body: req.body });
};
export const getEmployees = (req, res) => {
    return res.json({ message: "Get employees controller working" });
};
export const getEmployeeById = (req, res) => {
    return res.json({ message: "Get employee by ID controller working", id: req.params.id });
};
export const updateEmployee = (req, res) => {
    return res.json({ message: "Update employee controller working", id: req.params.id, body: req.body });
};
export const resetEmployeePassword = (req, res) => {
    return res.json({ message: "Reset employee password controller working", id: req.params.id });
};
export const archiveEmployee = (req, res) => {
    return res.json({ message: "Archive employee controller working", id: req.params.id });
};
export const recoverEmployee = (req, res) => {
    return res.json({ message: "Recover employee controller working", id: req.params.id });
};
//# sourceMappingURL=employee.controller.js.map