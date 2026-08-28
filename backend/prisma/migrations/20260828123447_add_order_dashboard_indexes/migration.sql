-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_paymentDate_idx" ON "Order"("paymentStatus", "paymentDate");

-- CreateIndex
CREATE INDEX "Order_status_claimedDate_idx" ON "Order"("status", "claimedDate");

