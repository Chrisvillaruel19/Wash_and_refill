-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "InventoryConsumption_orderId_idx" ON "InventoryConsumption"("orderId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
