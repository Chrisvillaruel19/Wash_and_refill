-- Links a withdrawal to the claimed-order refund it paid (see
-- Withdrawal.refundId), so reports can tell refunds apart from earnings the
-- Admin took. Existing withdrawals were all earnings: they stay null.

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "refundId" TEXT;

-- CreateIndex
CREATE INDEX "Withdrawal_refundId_idx" ON "Withdrawal"("refundId");

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
