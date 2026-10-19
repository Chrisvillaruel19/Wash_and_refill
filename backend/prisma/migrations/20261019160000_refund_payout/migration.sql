-- Cash refund payouts (see Refund.paidOutAt / paidOutById): a claimed
-- order's cash refund is approved by the Admin, then handed to the customer
-- by the staff member on duty from the drawer. Every refund recorded before
-- this existed was already settled when it was recorded, so it's marked paid
-- out at that moment with no staff payout (paidOutById stays null) — none of
-- them ever enters a drawer's math.

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "paidOutAt" TIMESTAMP(3),
ADD COLUMN     "paidOutById" TEXT;

UPDATE "Refund" SET "paidOutAt" = "createdAt";

-- CreateIndex
CREATE INDEX "Refund_paidOutAt_idx" ON "Refund"("paidOutAt");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paidOutById_fkey" FOREIGN KEY ("paidOutById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
