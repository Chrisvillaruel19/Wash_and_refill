-- CreateIndex
CREATE INDEX "Expense_shiftHandoverId_idx" ON "Expense"("shiftHandoverId");

-- CreateIndex
CREATE INDEX "Order_shiftHandoverId_idx" ON "Order"("shiftHandoverId");

-- CreateIndex
CREATE INDEX "Withdrawal_shiftHandoverId_idx" ON "Withdrawal"("shiftHandoverId");
