-- Track which balance a withdrawal draws from so GCash withdrawals do not
-- reduce the physical cash expected at Shift Handover. Existing withdrawals
-- are Cash by default, preserving their historical reconciliation behavior.
ALTER TABLE "Withdrawal"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';

ALTER TABLE "Withdrawal"
RENAME COLUMN "remainingCash" TO "remainingBalance";

-- Keep GCash withdrawals visible in their own Shift Handover total while
-- preserving the existing withdrawal total for historical/reporting use.
ALTER TABLE "ShiftHandover"
ADD COLUMN "digitalWithdrawal" DECIMAL(65,30) NOT NULL DEFAULT 0;