export const createSupply = (req, res) => {
    return res.json({ message: "Create supply controller working", body: req.body });
};
export const getSupplies = (_req, res) => {
    return res.json({ message: "Get supplies controller working" });
};
export const getSupplyById = (req, res) => {
    return res.json({ message: "Get supply by ID controller working", id: req.params.id });
};
export const updateSupply = (req, res) => {
    return res.json({ message: "Update supply controller working", id: req.params.id, body: req.body });
};
export const deleteSupply = (req, res) => {
    return res.json({ message: "Delete supply controller working", id: req.params.id });
};
export const restockSupply = (req, res) => {
    return res.json({ message: "Restock supply controller working", id: req.params.id, body: req.body });
};
export const getLowStockSupplies = (_req, res) => {
    return res.json({ message: "Get low stock supplies controller working" });
};
export const createPackage = (req, res) => {
    return res.json({ message: "Create package controller working", body: req.body });
};
export const getPackages = (_req, res) => {
    return res.json({ message: "Get packages controller working" });
};
export const getPackageById = (req, res) => {
    return res.json({ message: "Get package by ID controller working", id: req.params.id });
};
export const updatePackage = (req, res) => {
    return res.json({ message: "Update package controller working", id: req.params.id, body: req.body });
};
export const deletePackage = (req, res) => {
    return res.json({ message: "Delete package controller working", id: req.params.id });
};
export const addPackageItems = (req, res) => {
    return res.json({ message: "Add package items controller working", id: req.params.id, body: req.body });
};
export const createLaundryService = (req, res) => {
    return res.json({ message: "Create laundry service controller working", body: req.body });
};
export const getLaundryServices = (_req, res) => {
    return res.json({ message: "Get laundry services controller working" });
};
export const getLaundryServiceById = (req, res) => {
    return res.json({ message: "Get laundry service by ID controller working", id: req.params.id });
};
export const updateLaundryService = (req, res) => {
    return res.json({ message: "Update laundry service controller working", id: req.params.id, body: req.body });
};
export const deleteLaundryService = (req, res) => {
    return res.json({ message: "Delete laundry service controller working", id: req.params.id });
};
//# sourceMappingURL=catalog.controller.js.map