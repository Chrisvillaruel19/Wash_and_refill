-- Records which staff member received each order's payment (see
-- Order.paidById): the sale belongs to them. Existing paid orders were
-- attributed to their creator until now, so they're filled in with the
-- creator — every current record stays exactly as it is.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidById" TEXT;

UPDATE "Order" SET "paidById" = "userId" WHERE "paymentStatus" = 'PAID';

-- CreateIndex
CREATE INDEX "Order_paidById_idx" ON "Order"("paidById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
